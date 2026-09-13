-- Run after 202609130003_primary_account_context.sql. It links saved
-- beneficiaries to FluidBank accounts and makes both ledger sides atomic.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

alter table public.beneficiaries
  add column if not exists linked_account_id uuid references public.accounts(id)
    on delete set null;
create unique index if not exists beneficiaries_owner_linked_account_unique
  on public.beneficiaries(user_id, linked_account_id)
  where linked_account_id is not null;

-- Existing contacts become internal automatically when their CLABE matches an
-- account in this database. A contact without a match remains external and is
-- never reported as a completed local transfer.
with unique_matches as (
  select b.id as beneficiary_id, (array_agg(d.account_id order by d.account_id))[1] as account_id
  from public.beneficiaries b
  join public.account_details d on d.clabe = b.clabe and d.user_id <> b.user_id
  where b.linked_account_id is null and b.clabe is not null
  group by b.id
  having count(*) = 1
)
update public.beneficiaries b
set linked_account_id = m.account_id,
    status = 'verified'
from unique_matches m
where b.id = m.beneficiary_id;

alter table public.payment_orders
  add column if not exists note text,
  add column if not exists completed_at timestamptz,
  add column if not exists credited_account_id uuid references public.accounts(id)
    on delete restrict;
alter table public.payment_orders drop constraint if exists payment_orders_status_check;
alter table public.payment_orders
  add constraint payment_orders_status_check
  check (status in ('draft', 'awaiting_confirmation', 'scheduled', 'simulated', 'completed', 'failed', 'cancelled'));
alter table public.payment_orders drop constraint if exists payment_orders_note_length_check;
alter table public.payment_orders
  add constraint payment_orders_note_length_check check (note is null or length(note) <= 140);
alter table public.payment_orders drop constraint if exists payment_orders_completion_check;
alter table public.payment_orders
  add constraint payment_orders_completion_check
  check ((status = 'completed') = (completed_at is not null));

-- Form preparation runs through the dedicated read pool. These policies let
-- that role read only the subject placed in the transaction by DatabaseClient.
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_roles where rolname = 'mcp_reader') then
    grant select on public.users, public.accounts, public.account_details,
      public.cards, public.credit_card_terms, public.beneficiaries,
      public.payment_orders, public.budgets, public.savings_goals
      to mcp_reader;

    alter table public.users enable row level security;
    drop policy if exists a2ui_reader_owner on public.users;
    create policy a2ui_reader_owner on public.users
      for select to mcp_reader
      using (id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);

    foreach tbl in array array[
      'accounts', 'account_details', 'cards', 'credit_card_terms',
      'beneficiaries', 'payment_orders', 'budgets', 'savings_goals'
    ] loop
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists a2ui_reader_owner on public.%I', tbl);
      execute format(
        'create policy a2ui_reader_owner on public.%I for select to mcp_reader '
        'using (user_id = nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid)',
        tbl
      );
    end loop;
  end if;
end $$;

-- The action role may read and update only accounts explicitly linked to a
-- verified beneficiary owned by the authenticated sender.
drop policy if exists a2ui_action_linked_account_select on public.accounts;
create policy a2ui_action_linked_account_select on public.accounts
  for select to fluidbank_actions
  using (
    exists (
      select 1 from public.beneficiaries b
      where b.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        and b.linked_account_id = accounts.id
        and b.status = 'verified'
    )
  );
drop policy if exists a2ui_action_linked_account_update on public.accounts;
create policy a2ui_action_linked_account_update on public.accounts
  for update to fluidbank_actions
  using (
    exists (
      select 1 from public.beneficiaries b
      where b.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        and b.linked_account_id = accounts.id
        and b.status = 'verified'
    )
  )
  with check (
    exists (
      select 1 from public.beneficiaries b
      where b.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        and b.linked_account_id = accounts.id
        and b.status = 'verified'
    )
  );

grant select, update on public.accounts to fluidbank_actions;
grant select on public.account_details, public.cards, public.beneficiaries
  to fluidbank_actions;
grant select, update on public.credit_card_terms to fluidbank_actions;
grant select, insert on public.payment_orders to fluidbank_actions;
grant insert on public.transactions to fluidbank_actions;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts', 'account_details', 'cards', 'credit_card_terms',
    'beneficiaries', 'payment_orders'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists a2ui_action_owner on public.%I', tbl);
    execute format(
      'create policy a2ui_action_owner on public.%I for all to fluidbank_actions '
      'using (user_id = nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid) '
      'with check (user_id = nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid)',
      tbl
    );
  end loop;
end $$;

alter table public.transactions enable row level security;
drop policy if exists a2ui_action_transaction_owner on public.transactions;
create policy a2ui_action_transaction_owner on public.transactions
  for insert to fluidbank_actions
  with check (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and (
          a.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
          or exists (
            select 1 from public.beneficiaries b
            where b.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
              and b.linked_account_id = a.id
              and b.status = 'verified'
          )
        )
    )
  );

create or replace function public.apply_a2ui_action(
  p_name text, p_request_key text, p_payload_hash text, p_context jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  uid uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  saved public.a2ui_action_receipts;
  rid uuid;
  outcome jsonb;
  action_amount numeric(14,2);
  source_ids uuid[];
  source_id uuid;
  source_balance numeric(14,2);
  source_currency text;
  source_name text;
  recipient_ids uuid[];
  recipient_id uuid;
  recipient_name text;
  recipient_account_id uuid;
  recipient_balance numeric(14,2);
  recipient_currency text;
  target_ids uuid[];
  target_account_id uuid;
  target_name text;
  card_ids uuid[];
  card_id uuid;
  card_name text;
  credit_account_id uuid;
  prior_credit_available numeric(14,2);
  card_credit_limit numeric(14,2);
  prior_debt numeric(14,2);
begin
  if current_user <> 'fluidbank_actions' or uid is null then
    raise exception 'action_not_authorized';
  end if;
  if p_name not in (
    'budget.create', 'budget.update', 'savings_goal.create', 'savings_goal.update',
    'transfer.execute', 'credit_card.pay'
  ) then
    raise exception 'unknown_action';
  end if;
  if length(p_request_key) <> 64 or length(p_payload_hash) <> 64 then
    raise exception 'invalid_request_key';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_request_key, 0));
  select * into saved
  from public.a2ui_action_receipts
  where user_id = uid and request_key = p_request_key;
  if found then
    if saved.payload_hash <> p_payload_hash then
      raise exception 'idempotency_conflict';
    end if;
    return saved.result;
  end if;

  if p_name like 'budget.%' or p_name like 'savings_goal.%' then
    if length(trim(p_context->>'name')) not between 1 and 80 then
      raise exception 'invalid_name';
    end if;
    if p_name = 'budget.create' then
      insert into public.budgets(
        user_id, name, category, limit_amount, period_type, start_date, end_date
      ) values (
        uid, trim(p_context->>'name'), p_context->>'category',
        (p_context->>'limit_amount')::numeric, 'custom',
        (p_context->>'start_date')::date, (p_context->>'end_date')::date
      ) returning id into rid;
    elsif p_name = 'budget.update' then
      update public.budgets set
        name = trim(p_context->>'name'),
        category = p_context->>'category',
        limit_amount = (p_context->>'limit_amount')::numeric,
        period_type = 'custom',
        start_date = (p_context->>'start_date')::date,
        end_date = (p_context->>'end_date')::date
      where id = (p_context->>'id')::uuid and user_id = uid and currency = 'MXN'
      returning id into rid;
    elsif p_name = 'savings_goal.create' then
      insert into public.savings_goals(
        user_id, name, target_amount, target_date, suggested_monthly_contribution
      ) values (
        uid, trim(p_context->>'name'), (p_context->>'target_amount')::numeric,
        (p_context->>'target_date')::date,
        (p_context->>'suggested_monthly_contribution')::numeric
      ) returning id into rid;
    else
      update public.savings_goals set
        name = trim(p_context->>'name'),
        target_amount = (p_context->>'target_amount')::numeric,
        target_date = (p_context->>'target_date')::date,
        suggested_monthly_contribution =
          (p_context->>'suggested_monthly_contribution')::numeric
      where id = (p_context->>'id')::uuid and user_id = uid and currency = 'MXN'
      returning id into rid;
    end if;
    if rid is null then
      raise exception 'record_not_available';
    end if;
    outcome := jsonb_build_object('id', rid, 'status', 'success');
  else
    action_amount := round((p_context->>'amount')::numeric, 2);
    if action_amount <= 0 or action_amount > 100000 then
      raise exception 'invalid_amount';
    end if;

    select array_agg(a.id order by a.id) into source_ids
    from public.accounts a
    join public.account_details d on d.account_id = a.id and d.user_id = a.user_id
    where a.user_id = uid
      and a.account_type in ('checking', 'savings')
      and a.currency = 'MXN'
      and (
        lower(d.display_name) = lower(trim(p_context->>'source_account'))
        or d.last_four = right(regexp_replace(p_context->>'source_account', '[^0-9]', '', 'g'), 4)
      );
    if coalesce(cardinality(source_ids), 0) <> 1 then
      raise exception 'source_account_not_available';
    end if;
    source_id := source_ids[1];
    select available_balance, currency into source_balance, source_currency
    from public.accounts
    where id = source_id and user_id = uid
    for update;
    if source_balance < action_amount then
      raise exception 'insufficient_funds';
    end if;
    select display_name into source_name
    from public.account_details
    where account_id = source_id and user_id = uid;

    if p_name = 'transfer.execute' then
      if length(trim(p_context->>'concept')) not between 1 and 140 then
        raise exception 'invalid_concept';
      end if;
      select array_agg(b.id order by b.id) into recipient_ids
      from public.beneficiaries b
      where b.user_id = uid and b.status <> 'inactive'
        and (
          lower(b.display_name) = lower(trim(p_context->>'recipient'))
          or b.last_four = right(regexp_replace(p_context->>'recipient', '[^0-9]', '', 'g'), 4)
        );
      select array_agg(a.id order by a.id) into target_ids
      from public.accounts a
      join public.account_details d on d.account_id = a.id and d.user_id = a.user_id
      where a.user_id = uid and a.id <> source_id
        and a.account_type in ('checking', 'savings') and a.currency = source_currency
        and (
          lower(d.display_name) = lower(trim(p_context->>'recipient'))
          or d.last_four = right(regexp_replace(p_context->>'recipient', '[^0-9]', '', 'g'), 4)
          or (
            lower(trim(p_context->>'recipient')) in ('ahorro', 'cuenta de ahorro', 'mi cuenta de ahorro')
            and a.account_type = 'savings'
          )
          or (
            lower(trim(p_context->>'recipient')) in ('cheques', 'cuenta de cheques', 'mi cuenta de cheques')
            and a.account_type = 'checking'
          )
        );
      if coalesce(cardinality(recipient_ids), 0)
        + coalesce(cardinality(target_ids), 0) <> 1 then
        raise exception 'recipient_not_available';
      end if;
      if coalesce(cardinality(recipient_ids), 0) = 1 then
        recipient_id := recipient_ids[1];
        select display_name, linked_account_id
        into recipient_name, recipient_account_id
        from public.beneficiaries
        where id = recipient_id and user_id = uid;
        if recipient_account_id is null then
          raise exception 'external_recipient_not_supported';
        end if;
        if recipient_account_id = source_id then
          raise exception 'recipient_matches_source';
        end if;
        select available_balance, currency
        into recipient_balance, recipient_currency
        from public.accounts
        where id = recipient_account_id
          and account_type in ('checking', 'savings')
        for update;
        if not found or recipient_currency <> source_currency then
          raise exception 'recipient_account_not_available';
        end if;
      else
        target_account_id := target_ids[1];
        select d.display_name into target_name
        from public.account_details d
        where d.account_id = target_account_id and d.user_id = uid;
        perform 1 from public.accounts
        where id = target_account_id and user_id = uid
        for update;
      end if;

      update public.accounts
      set available_balance = available_balance - action_amount
      where id = source_id and user_id = uid;
      if target_account_id is not null then
        update public.accounts
        set available_balance = available_balance + action_amount
        where id = target_account_id and user_id = uid;
      elsif recipient_account_id is not null then
        update public.accounts
        set available_balance = available_balance + action_amount
        where id = recipient_account_id;
      end if;
      insert into public.payment_orders(
        user_id, from_account_id, beneficiary_id, target_account_id, credited_account_id,
        kind, amount, fee, currency,
        requested_date, status, note, completed_at
      ) values (
        uid, source_id, recipient_id, target_account_id,
        coalesce(recipient_account_id, target_account_id),
        'transfer', action_amount, 0, source_currency,
        current_date, 'completed', trim(p_context->>'concept'), clock_timestamp()
      ) returning id into rid;
      insert into public.transactions(
        id, account_id, amount, direction, category, merchant, occurred_at
      ) values (
        gen_random_uuid(), source_id, action_amount, 'debit', 'transfer',
        coalesce(recipient_name, target_name), clock_timestamp()
      );
      if target_account_id is not null then
        insert into public.transactions(
          id, account_id, amount, direction, category, merchant, occurred_at
        ) values (
          gen_random_uuid(), target_account_id, action_amount, 'credit', 'transfer',
          source_name, clock_timestamp()
        );
      elsif recipient_account_id is not null then
        insert into public.transactions(
          id, account_id, amount, direction, category, merchant, occurred_at
        ) values (
          gen_random_uuid(), recipient_account_id, action_amount, 'credit', 'transfer',
          source_name, clock_timestamp()
        );
      end if;
      outcome := jsonb_build_object(
        'id', rid,
        'status', 'success',
        'kind', 'transfer',
        'amount', action_amount,
        'currency', source_currency,
        'available_balance', source_balance - action_amount,
        'recipient_balance', case
          when recipient_account_id is not null then recipient_balance + action_amount
          else null
        end
      );
    else
      select array_agg(c.id order by c.id) into card_ids
      from public.cards c
      join public.accounts a on a.id = c.account_id and a.user_id = c.user_id
      join public.credit_card_terms t on t.account_id = c.account_id and t.user_id = c.user_id
      where c.user_id = uid and c.card_type = 'credit' and c.status = 'active'
        and a.account_type = 'credit' and a.currency = 'MXN' and t.currency = 'MXN'
        and (
          lower(c.display_name) = lower(trim(p_context->>'card'))
          or c.last_four = right(regexp_replace(p_context->>'card', '[^0-9]', '', 'g'), 4)
        );
      if coalesce(cardinality(card_ids), 0) <> 1 then
        raise exception 'credit_card_not_available';
      end if;
      card_id := card_ids[1];
      select c.display_name, c.account_id
      into card_name, credit_account_id
      from public.cards c
      where c.id = card_id and c.user_id = uid;
      select a.available_balance, t.credit_limit, t.current_debt
      into prior_credit_available, card_credit_limit, prior_debt
      from public.accounts a
      join public.credit_card_terms t on t.account_id = a.id and t.user_id = a.user_id
      where a.id = credit_account_id and a.user_id = uid
      for update of a, t;
      if action_amount > prior_debt then
        raise exception 'payment_exceeds_debt';
      end if;

      update public.accounts
      set available_balance = available_balance - action_amount
      where id = source_id and user_id = uid;
      update public.accounts
      set available_balance = least(card_credit_limit, available_balance + action_amount)
      where id = credit_account_id and user_id = uid;
      update public.credit_card_terms set
        current_debt = greatest(0, current_debt - action_amount),
        statement_balance = greatest(0, statement_balance - action_amount),
        minimum_payment = greatest(0, minimum_payment - action_amount),
        interest_free_payment = greatest(0, interest_free_payment - action_amount),
        as_of = current_date
      where account_id = credit_account_id and user_id = uid;
      insert into public.payment_orders(
        user_id, from_account_id, target_account_id, kind, amount, fee, currency,
        requested_date, status, note, completed_at
      ) values (
        uid, source_id, credit_account_id, 'card_payment', action_amount, 0,
        source_currency, current_date, 'completed', card_name, clock_timestamp()
      ) returning id into rid;
      insert into public.transactions(
        id, account_id, amount, direction, category, merchant, occurred_at
      ) values (
        gen_random_uuid(), source_id, action_amount, 'debit', 'credit_card',
        card_name, clock_timestamp()
      );
      outcome := jsonb_build_object(
        'id', rid,
        'status', 'success',
        'kind', 'card_payment',
        'amount', action_amount,
        'currency', source_currency,
        'available_balance', source_balance - action_amount,
        'current_debt', prior_debt - action_amount,
        'available_credit', least(card_credit_limit, prior_credit_available + action_amount)
      );
    end if;
  end if;

  insert into public.a2ui_action_receipts(user_id, request_key, payload_hash, result)
  values(uid, p_request_key, p_payload_hash, outcome);
  return outcome;
end $$;

revoke all on function public.apply_a2ui_action(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_a2ui_action(text, text, text, jsonb)
  to fluidbank_actions;
commit;
