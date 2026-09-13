-- Run after financial_question_bank.sql. Configure a password for this dedicated
-- login separately; never use the postgres/service_role connection in the MCP.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'fluidbank_actions') then
    create role fluidbank_actions login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end $$;
grant usage on schema public to fluidbank_actions;
grant select, insert, update on public.budgets, public.savings_goals to fluidbank_actions;

create table if not exists public.a2ui_action_receipts (
  user_id uuid not null references public.users(id),
  request_key text not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_key)
);
alter table public.a2ui_action_receipts enable row level security;
grant select, insert on public.a2ui_action_receipts to fluidbank_actions;
do $$ declare tbl text; begin
  foreach tbl in array array['budgets','savings_goals','a2ui_action_receipts'] loop
    execute format('drop policy if exists a2ui_action_owner on public.%I', tbl);
    execute format('create policy a2ui_action_owner on public.%I for all to fluidbank_actions using (user_id = nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid) with check (user_id = nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid)', tbl);
  end loop;
end $$;

-- Fixed dispatcher, invoker rights + RLS. No SQL, table or column names from clients.
create or replace function public.apply_a2ui_action(
  p_name text, p_request_key text, p_payload_hash text, p_context jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  uid uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  saved public.a2ui_action_receipts;
  rid uuid;
  outcome jsonb;
begin
  if current_user <> 'fluidbank_actions' or uid is null then raise exception 'action_not_authorized'; end if;
  if p_name not in ('budget.create','budget.update','savings_goal.create','savings_goal.update') then raise exception 'unknown_action'; end if;
  if length(p_request_key) <> 64 or length(p_payload_hash) <> 64 then raise exception 'invalid_request_key'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_request_key, 0));
  select * into saved from public.a2ui_action_receipts where user_id=uid and request_key=p_request_key;
  if found then
    if saved.payload_hash <> p_payload_hash then raise exception 'idempotency_conflict'; end if;
    return saved.result;
  end if;
  if length(trim(p_context->>'name')) not between 1 and 80 then raise exception 'invalid_name'; end if;
  if p_name like 'budget.%' then
    if p_name = 'budget.create' then
      insert into public.budgets(user_id,name,category,limit_amount,period_type,start_date,end_date)
      values(uid,trim(p_context->>'name'),p_context->>'category',(p_context->>'limit_amount')::numeric,'custom',(p_context->>'start_date')::date,(p_context->>'end_date')::date) returning id into rid;
    else
      update public.budgets set name=trim(p_context->>'name'),category=p_context->>'category',limit_amount=(p_context->>'limit_amount')::numeric,
        period_type='custom',start_date=(p_context->>'start_date')::date,end_date=(p_context->>'end_date')::date
      where id=(p_context->>'id')::uuid and user_id=uid and currency='MXN' returning id into rid;
    end if;
  else
    if p_name = 'savings_goal.create' then
      insert into public.savings_goals(user_id,name,target_amount,target_date,suggested_monthly_contribution)
      values(uid,trim(p_context->>'name'),(p_context->>'target_amount')::numeric,(p_context->>'target_date')::date,(p_context->>'suggested_monthly_contribution')::numeric) returning id into rid;
    else
      update public.savings_goals set name=trim(p_context->>'name'),target_amount=(p_context->>'target_amount')::numeric,
        target_date=(p_context->>'target_date')::date,suggested_monthly_contribution=(p_context->>'suggested_monthly_contribution')::numeric
      where id=(p_context->>'id')::uuid and user_id=uid and currency='MXN' returning id into rid;
    end if;
  end if;
  if rid is null then raise exception 'record_not_available'; end if;
  outcome := jsonb_build_object('id',rid,'status','success');
  insert into public.a2ui_action_receipts(user_id,request_key,payload_hash,result) values(uid,p_request_key,p_payload_hash,outcome);
  return outcome;
end $$;
revoke all on function public.apply_a2ui_action(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.apply_a2ui_action(text,text,text,jsonb) to fluidbank_actions;
commit;
