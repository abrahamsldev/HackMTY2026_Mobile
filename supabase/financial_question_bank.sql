-- HACKMTY MVP: tables + synthetic data. Paste this entire file into Supabase SQL Editor.
-- Target user: f52827d7-0213-4df4-9621-14775d6228d4
-- Apply once. A failure rolls back the schema and seed together. No existing rows are overwritten.
-- No real payments, bank reports, notifications or downloadable documents are created.

-- Financial data for the MVP. No payment execution, external reports or notifications.
-- Run once in Supabase SQL Editor, or with psql using a migration-capable connection.
-- Existing user/account/transaction data is preserved. The whole migration is atomic.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Composite references prevent linking a user's records to another user's accounts.
create unique index if not exists accounts_user_id_id_finance_key on public.accounts(user_id, id);
create unique index if not exists transactions_account_id_id_finance_key on public.transactions(account_id, id);

create table public.account_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null unique,
  display_name text not null check (length(display_name) between 1 and 120),
  bank_name text not null,
  last_four text check (last_four ~ '^[0-9]{4}$'),
  clabe text check (clabe ~ '^[0-9]{18}$'),
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null,
  display_name text not null,
  card_type text not null check (card_type in ('debit', 'credit')),
  network text not null check (network in ('visa', 'mastercard', 'amex', 'other')),
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  status text not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  expires_month smallint check (expires_month between 1 and 12),
  expires_year smallint check (expires_year between 2020 and 2200),
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.credit_card_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null unique,
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  credit_limit numeric(14,2) not null check (credit_limit > 0),
  current_debt numeric(14,2) not null check (current_debt >= 0),
  statement_balance numeric(14,2) not null check (statement_balance >= 0),
  minimum_payment numeric(14,2) not null check (minimum_payment >= 0),
  interest_free_payment numeric(14,2) not null check (interest_free_payment >= minimum_payment),
  annual_interest_rate numeric(9,4) not null check (annual_interest_rate between 0 and 1000),
  cat_percentage numeric(9,4) check (cat_percentage between 0 and 1000),
  cutoff_date date not null,
  due_date date not null check (due_date > cutoff_date),
  as_of date not null,
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid,
  name text not null,
  debt_type text not null check (debt_type in ('personal_loan', 'credit_card', 'mortgage', 'other')),
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  outstanding_principal numeric(14,2) not null check (outstanding_principal > 0),
  annual_interest_rate numeric(9,4) not null check (annual_interest_rate between 0 and 1000),
  monthly_payment numeric(14,2) not null check (monthly_payment > 0),
  next_due_date date not null,
  status text not null default 'active' check (status in ('active', 'paid', 'paused')),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.debt_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  debt_id uuid not null,
  name text not null,
  monthly_payment numeric(14,2) not null check (monthly_payment > 0),
  extra_monthly_payment numeric(14,2) not null default 0 check (extra_monthly_payment >= 0),
  estimated_months integer not null check (estimated_months between 1 and 600),
  total_interest numeric(14,2) not null check (total_interest >= 0),
  total_paid numeric(14,2) not null check (total_paid >= total_interest),
  assumptions text not null,
  calculated_at timestamptz not null default now(),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid,
  name text not null,
  category text not null,
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  period_type text not null check (period_type in ('weekly', 'monthly', 'custom')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid,
  name text not null,
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date not null,
  suggested_monthly_contribution numeric(14,2) not null check (suggested_monthly_contribution >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  contributed_at timestamptz not null,
  note text,
  foreign key (user_id, goal_id) references public.savings_goals(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.scheduled_cash_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null,
  name text not null,
  direction text not null check (direction in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  scheduled_date date not null,
  status text not null default 'expected' check (status in ('expected', 'confirmed', 'cancelled')),
  note text,
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade,
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null,
  bank_name text not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  clabe text check (clabe ~ '^[0-9]{18}$'),
  status text not null default 'draft' check (status in ('draft', 'verified', 'inactive')),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_account_id uuid not null,
  beneficiary_id uuid,
  target_account_id uuid,
  debt_id uuid,
  kind text not null check (kind in ('transfer', 'card_payment', 'debt_payment')),
  amount numeric(14,2) not null check (amount > 0),
  fee numeric(14,2) not null default 0 check (fee >= 0),
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  requested_date date,
  status text not null default 'draft' check (status in ('draft', 'awaiting_confirmation', 'simulated', 'cancelled')),
  foreign key (user_id, from_account_id) references public.accounts(user_id, id),
  foreign key (user_id, beneficiary_id) references public.beneficiaries(user_id, id),
  foreign key (user_id, target_account_id) references public.accounts(user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id),
  check (
    (kind = 'transfer' and num_nonnulls(beneficiary_id, target_account_id) = 1 and debt_id is null)
    or (kind = 'card_payment' and target_account_id is not null and beneficiary_id is null and debt_id is null)
    or (kind = 'debt_payment' and debt_id is not null and beneficiary_id is null and target_account_id is null)
  ),
  check (target_account_id is null or target_account_id <> from_account_id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.transaction_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null,
  transaction_id uuid not null,
  card_id uuid,
  reason text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'resolved', 'cancelled')),
  resolution text,
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  foreign key (account_id, transaction_id) references public.transactions(account_id, id),
  foreign key (user_id, card_id) references public.cards(user_id, id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  opening_balance numeric(14,2) not null,
  total_income numeric(14,2) not null check (total_income >= 0),
  total_expenses numeric(14,2) not null check (total_expenses >= 0),
  closing_balance numeric(14,2) not null,
  document_status text not null default 'metadata_only' check (document_status in ('metadata_only', 'processing', 'available')),
  storage_bucket text,
  storage_path text,
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  check (closing_balance = opening_balance + total_income - total_expenses),
  check (document_status <> 'available' or (storage_bucket is not null and storage_path is not null)),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

create table public.financial_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid,
  budget_id uuid,
  title text not null,
  message text not null,
  kind text not null check (kind in ('low_balance', 'budget_limit', 'payment_due', 'savings_goal', 'security')),
  threshold_amount numeric(14,2) check (threshold_amount >= 0),
  due_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'dismissed')),
  channel text not null default 'in_app' check (channel = 'in_app'),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  foreign key (user_id, budget_id) references public.budgets(user_id, id),
  data_origin text not null default 'user' check (data_origin in ('user', 'provider', 'synthetic')),
  created_at timestamptz not null default now(),
  unique (user_id, id)

);

-- User-scoped read access. Client writes to financial state are deliberately absent.
-- Existing tables and their policies are not changed by this migration.
alter table public.account_details enable row level security;
revoke all on table public.account_details from public, anon, authenticated;
grant select on table public.account_details to authenticated;
grant select, insert, update, delete on table public.account_details to service_role;
create policy account_details_select_own on public.account_details
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.cards enable row level security;
revoke all on table public.cards from public, anon, authenticated;
grant select on table public.cards to authenticated;
grant select, insert, update, delete on table public.cards to service_role;
create policy cards_select_own on public.cards
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.credit_card_terms enable row level security;
revoke all on table public.credit_card_terms from public, anon, authenticated;
grant select on table public.credit_card_terms to authenticated;
grant select, insert, update, delete on table public.credit_card_terms to service_role;
create policy credit_card_terms_select_own on public.credit_card_terms
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.debts enable row level security;
revoke all on table public.debts from public, anon, authenticated;
grant select on table public.debts to authenticated;
grant select, insert, update, delete on table public.debts to service_role;
create policy debts_select_own on public.debts
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.debt_scenarios enable row level security;
revoke all on table public.debt_scenarios from public, anon, authenticated;
grant select on table public.debt_scenarios to authenticated;
grant select, insert, update, delete on table public.debt_scenarios to service_role;
create policy debt_scenarios_select_own on public.debt_scenarios
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.budgets enable row level security;
revoke all on table public.budgets from public, anon, authenticated;
grant select on table public.budgets to authenticated;
grant select, insert, update, delete on table public.budgets to service_role;
create policy budgets_select_own on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.savings_goals enable row level security;
revoke all on table public.savings_goals from public, anon, authenticated;
grant select on table public.savings_goals to authenticated;
grant select, insert, update, delete on table public.savings_goals to service_role;
create policy savings_goals_select_own on public.savings_goals
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.savings_contributions enable row level security;
revoke all on table public.savings_contributions from public, anon, authenticated;
grant select on table public.savings_contributions to authenticated;
grant select, insert, update, delete on table public.savings_contributions to service_role;
create policy savings_contributions_select_own on public.savings_contributions
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.scheduled_cash_flows enable row level security;
revoke all on table public.scheduled_cash_flows from public, anon, authenticated;
grant select on table public.scheduled_cash_flows to authenticated;
grant select, insert, update, delete on table public.scheduled_cash_flows to service_role;
create policy scheduled_cash_flows_select_own on public.scheduled_cash_flows
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.beneficiaries enable row level security;
revoke all on table public.beneficiaries from public, anon, authenticated;
grant select on table public.beneficiaries to authenticated;
grant select, insert, update, delete on table public.beneficiaries to service_role;
create policy beneficiaries_select_own on public.beneficiaries
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.payment_orders enable row level security;
revoke all on table public.payment_orders from public, anon, authenticated;
grant select on table public.payment_orders to authenticated;
grant select, insert, update, delete on table public.payment_orders to service_role;
create policy payment_orders_select_own on public.payment_orders
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.transaction_disputes enable row level security;
revoke all on table public.transaction_disputes from public, anon, authenticated;
grant select on table public.transaction_disputes to authenticated;
grant select, insert, update, delete on table public.transaction_disputes to service_role;
create policy transaction_disputes_select_own on public.transaction_disputes
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.bank_statements enable row level security;
revoke all on table public.bank_statements from public, anon, authenticated;
grant select on table public.bank_statements to authenticated;
grant select, insert, update, delete on table public.bank_statements to service_role;
create policy bank_statements_select_own on public.bank_statements
  for select to authenticated using (user_id = (select auth.uid()));
alter table public.financial_alerts enable row level security;
revoke all on table public.financial_alerts from public, anon, authenticated;
grant select on table public.financial_alerts to authenticated;
grant select, insert, update, delete on table public.financial_alerts to service_role;
create policy financial_alerts_select_own on public.financial_alerts
  for select to authenticated using (user_id = (select auth.uid()));

create index budgets_user_period_idx on public.budgets(user_id, start_date, end_date);
create index scheduled_cash_flows_user_date_idx on public.scheduled_cash_flows(user_id, scheduled_date);
create index savings_contributions_goal_idx on public.savings_contributions(user_id, goal_id);
create index bank_statements_user_period_idx on public.bank_statements(user_id, period_start);

-- Calculate spending from the existing ledger; do not duplicate a mutable spent field.
-- For an "all" budget, card payments and transfers are excluded to avoid double-counting.
create view public.budget_progress with (security_invoker = true) as
select b.*, coalesce(s.spent, 0)::numeric(14,2) as spent_amount,
  (b.limit_amount - coalesce(s.spent, 0))::numeric(14,2) as remaining_amount,
  least(100, round(100 * coalesce(s.spent, 0) / b.limit_amount, 2)) as progress_percentage
from public.budgets b
left join lateral (
  select sum(t.amount) as spent
  from public.transactions t join public.accounts a on a.id = t.account_id
  where a.user_id = b.user_id and a.currency = b.currency
    and (b.account_id is null or a.id = b.account_id)
    and t.direction = 'debit'
    and ((b.category = 'all' and t.category not in ('credit_card', 'transfer')) or t.category = b.category)
    and (t.occurred_at at time zone 'America/Monterrey')::date between b.start_date and b.end_date
) s on true;

create view public.savings_goal_progress with (security_invoker = true) as
select g.*, coalesce(s.saved, 0)::numeric(14,2) as saved_amount,
  greatest(0, g.target_amount - coalesce(s.saved, 0))::numeric(14,2) as remaining_amount,
  least(100, round(100 * coalesce(s.saved, 0) / g.target_amount, 2)) as progress_percentage
from public.savings_goals g
left join lateral (
  select sum(c.amount) as saved from public.savings_contributions c
  where c.user_id = g.user_id and c.goal_id = g.id
) s on true;

revoke all on public.budget_progress, public.savings_goal_progress from public, anon, authenticated;
grant select on public.budget_progress, public.savings_goal_progress to authenticated, service_role;

comment on table public.payment_orders is 'Review/simulation records only. Inserting a row never executes a payment.';
comment on table public.bank_statements is 'Statement metadata. Available requires an actual protected Storage object supplied by the backend.';
comment on table public.credit_card_terms is 'Backend/provider snapshot. Rates are percentage points, not fractions; synthetic rows are for MVP demonstrations.';
comment on table public.savings_contributions is 'Goal allocation ledger. Inserting a contribution does not move account funds.';
comment on column public.account_details.clabe is 'Sensitive account identifier, own-user read only. Synthetic identifiers must never be used for real payments.';

notify pgrst, 'reload schema';

-- SYNTHETIC DATA FOR THE REQUESTED USER
-- Synthetic data ONLY for f52827d7-0213-4df4-9621-14775d6228d4. No existing row is overwritten.
-- Run after 202609120001_financial_question_bank.sql. Safe to rerun (stable IDs).
-- CLABEs below are deliberately fictitious, not usable banking identifiers.
-- This file does not create Auth users, transfer money or submit external reports.
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $seed$
declare
  target_user uuid := 'f52827d7-0213-4df4-9621-14775d6228d4';
  anchor_date date := (now() at time zone 'America/Monterrey')::date;
  checking_id uuid;
  credit_id uuid;
  savings_id uuid;
  disputed_id uuid;
  disputed_account uuid;
  income numeric(14,2);
  expenses numeric(14,2);
  previous_start date;
  previous_end date;
begin
  if not exists (select 1 from public.users where id = target_user) then
    raise exception 'The requested application user does not exist; no data has been inserted.';
  end if;
  select id into checking_id from public.accounts
    where user_id = target_user and account_type = 'checking' and currency = 'MXN' order by created_at, id limit 1;
  select id into credit_id from public.accounts
    where user_id = target_user and account_type = 'credit' and currency = 'MXN' order by created_at, id limit 1;
  if checking_id is null or credit_id is null then
    raise exception 'The requested user must have the existing MXN checking and credit accounts.';
  end if;

  select id into savings_id from public.accounts
    where user_id = target_user and account_type = 'savings' and currency = 'MXN' order by created_at, id limit 1;
  if savings_id is null then
    savings_id := '5f0567e8-0eb9-5a3f-8b9d-7cac78e8d4fb'::uuid;
    insert into public.accounts(id, user_id, account_type, currency, available_balance, created_at)
      values(savings_id, target_user, 'savings', 'MXN', 9000, (anchor_date - 120)::timestamptz)
      on conflict (id) do nothing;
  end if;

  insert into public.account_details(id, user_id, account_id, display_name, bank_name, last_four, clabe, data_origin) values
    ('e86fc276-951a-51a6-842d-ccf642a7f0df'::uuid, target_user, checking_id, 'Cuenta de cheques', 'Banorte · ejemplo MVP', '1234', '000000000000001234', 'synthetic'),
    ('8e947517-9c60-5532-b178-dc5fc982c3c9'::uuid, target_user, credit_id, 'Tarjeta Oro', 'Banorte · ejemplo MVP', '9012', null, 'synthetic'),
    ('8c269bed-c731-556e-b365-6293c019a60f'::uuid, target_user, savings_id, 'Ahorro para mis metas', 'Banorte · ejemplo MVP', '5678', '000000000000005678', 'synthetic')
    on conflict do nothing;

  insert into public.cards(id, user_id, account_id, display_name, card_type, network, last_four, status, expires_month, expires_year, data_origin) values
    ('ffa72885-b5ad-517d-93b6-5e72f7ea2c5d'::uuid, target_user, checking_id, 'Débito de ejemplo', 'debit', 'visa', '1234', 'active', 12, extract(year from anchor_date)::integer + 3, 'synthetic'),
    ('5d3ec491-64dc-500e-b357-e732850cf990'::uuid, target_user, credit_id, 'Oro de ejemplo', 'credit', 'mastercard', '9012', 'active', 12, extract(year from anchor_date)::integer + 3, 'synthetic')
    on conflict (id) do nothing;

  insert into public.credit_card_terms(id, user_id, account_id, credit_limit, current_debt, statement_balance, minimum_payment, interest_free_payment, annual_interest_rate, cat_percentage, cutoff_date, due_date, as_of, data_origin)
    select 'b76c15d8-75b8-5f64-8ee9-3ace641f8cd1'::uuid, target_user, credit_id, greatest(a.available_balance, 0) + 8500, 8500, 6200, 420, 6200, 42, 53.2, anchor_date - 7, anchor_date + 13, anchor_date, 'synthetic'
    from public.accounts a where a.id = credit_id and a.user_id = target_user
    on conflict do nothing;

  insert into public.debts(id, user_id, name, debt_type, outstanding_principal, annual_interest_rate, monthly_payment, next_due_date, data_origin) values
    ('9fbebc47-170c-5405-b8b0-a8e59b34926d'::uuid, target_user, 'Préstamo personal de ejemplo', 'personal_loan', 25000, 24, 2000, anchor_date + 8, 'synthetic')
    on conflict (id) do nothing;

  insert into public.debt_scenarios(id, user_id, debt_id, name, monthly_payment, extra_monthly_payment, estimated_months, total_interest, total_paid, assumptions, data_origin) values
    ('db62a710-b794-5cac-8fa6-56787460572e'::uuid, target_user, '9fbebc47-170c-5405-b8b0-a8e59b34926d'::uuid, 'Pago actual', 2000, 0, 15, 4059.88, 29059.88, 'Simulación: capital $25,000; tasa nominal anual fija 24%, mensual 2%; interés redondeado a centavos; pago al final del mes y último pago ajustado. Sin comisiones, seguros, impuestos ni cargos nuevos.', 'synthetic')
    on conflict (id) do nothing;

  insert into public.debt_scenarios(id, user_id, debt_id, name, monthly_payment, extra_monthly_payment, estimated_months, total_interest, total_paid, assumptions, data_origin) values
    ('db3df2ce-51ba-5c6f-a9bb-3913a6e4bf0a'::uuid, target_user, '9fbebc47-170c-5405-b8b0-a8e59b34926d'::uuid, 'Aportación extra de $600', 2600, 600, 11, 3045.70, 28045.70, 'Simulación: capital $25,000; tasa nominal anual fija 24%, mensual 2%; interés redondeado a centavos; pago al final del mes y último pago ajustado. Sin comisiones, seguros, impuestos ni cargos nuevos.', 'synthetic')
    on conflict (id) do nothing;

  insert into public.budgets(id, user_id, name, category, limit_amount, period_type, start_date, end_date, status, data_origin) values
    ('dd8e0b11-de79-5dbd-8d91-ab587381f675'::uuid, target_user, 'Despensa del mes', 'groceries', 2500, 'monthly', date_trunc('month', anchor_date)::date, (date_trunc('month', anchor_date) + interval '1 month - 1 day')::date, 'active', 'synthetic'),
    ('389777c0-efa8-5ca1-b154-625482217d56'::uuid, target_user, 'Comida fuera de casa', 'dining', 900, 'weekly', date_trunc('week', anchor_date)::date, date_trunc('week', anchor_date)::date + 6, 'active', 'synthetic'),
    ('7e6a94cc-00bd-54d5-9a55-796c6dbc620e'::uuid, target_user, 'Transporte de la semana', 'transport', 600, 'weekly', date_trunc('week', anchor_date)::date, date_trunc('week', anchor_date)::date + 6, 'active', 'synthetic')
    on conflict (id) do nothing;

  insert into public.savings_goals(id, user_id, account_id, name, target_amount, target_date, suggested_monthly_contribution, data_origin) values
    ('74814ec8-98ae-5cfe-a077-565a8bb6e697'::uuid, target_user, savings_id, 'Mi próxima laptop', 18000, (anchor_date + interval '6 months')::date, 1800, 'synthetic'),
    ('98ef8cbc-4970-561b-a1be-682a65187b98'::uuid, target_user, savings_id, 'Fondo de emergencia', 12000, (anchor_date + interval '12 months')::date, 850, 'synthetic')
    on conflict (id) do nothing;
  insert into public.savings_contributions(id, user_id, goal_id, amount, contributed_at, note, data_origin) values
    ('cd3731f3-68d8-5e18-8ca7-f4e19e6cd941'::uuid, target_user, '74814ec8-98ae-5cfe-a077-565a8bb6e697'::uuid, 2400, (anchor_date - 90)::timestamptz, 'Aportación histórica ficticia', 'synthetic'),
    ('73311625-5c54-56bb-a87e-e625380e5e3c'::uuid, target_user, '74814ec8-98ae-5cfe-a077-565a8bb6e697'::uuid, 2400, (anchor_date - 60)::timestamptz, 'Aportación histórica ficticia', 'synthetic'),
    ('94ed6f7e-1ddf-59f8-bd51-56c243a41c36'::uuid, target_user, '74814ec8-98ae-5cfe-a077-565a8bb6e697'::uuid, 2400, (anchor_date - 30)::timestamptz, 'Aportación histórica ficticia', 'synthetic'),
    ('d2e9810b-c567-5ce4-9d06-0b8d5c144bed'::uuid, target_user, '98ef8cbc-4970-561b-a1be-682a65187b98'::uuid, 900, (anchor_date - 45)::timestamptz, 'Aportación histórica ficticia', 'synthetic'),
    ('c59e9586-1269-50d9-a81e-349bfad00bd3'::uuid, target_user, '98ef8cbc-4970-561b-a1be-682a65187b98'::uuid, 900, (anchor_date - 15)::timestamptz, 'Aportación histórica ficticia', 'synthetic')
    on conflict (id) do nothing;

  -- Do not duplicate subscriptions: these are additional dated forecast events.
  insert into public.scheduled_cash_flows(id, user_id, account_id, name, direction, amount, scheduled_date, status, note, data_origin) values
    ('5bbb065b-3969-55cc-9513-603807d39cb4'::uuid, target_user, checking_id, 'Próxima nómina', 'income', 12000, anchor_date + 3, 'expected', 'Estimación ficticia; no es un ingreso garantizado', 'synthetic'),
    ('35d6a585-8128-5f9b-b47e-5319464f5547'::uuid, target_user, checking_id, 'Siguiente nómina', 'income', 12000, anchor_date + 18, 'expected', 'Estimación ficticia; no es un ingreso garantizado', 'synthetic'),
    ('343240cb-9178-5b9c-ac4f-0445a53b2df5'::uuid, target_user, checking_id, 'Curso de capacitación', 'expense', 1800, anchor_date + 10, 'expected', 'Pago futuro de ejemplo, no ejecutado', 'synthetic')
    on conflict (id) do nothing;

  insert into public.beneficiaries(id, user_id, display_name, bank_name, last_four, clabe, status, data_origin) values
    ('120ae2eb-7143-5d9d-880f-820fa5f734a0'::uuid, target_user, 'Ana · destinataria ficticia', 'Banco de ejemplo', '4321', '000000000000004321', 'draft', 'synthetic')
    on conflict (id) do nothing;
  insert into public.payment_orders(id, user_id, from_account_id, beneficiary_id, target_account_id, debt_id, kind, amount, fee, requested_date, status, data_origin) values
    ('bb12fa32-252a-547a-a23f-d02f573cb6a6'::uuid, target_user, checking_id, '120ae2eb-7143-5d9d-880f-820fa5f734a0'::uuid, null, null, 'transfer', 500, 0, anchor_date + 1, 'draft', 'synthetic'),
    ('e61faa95-010e-5469-b3ee-2e3c7ac480ce'::uuid, target_user, checking_id, null, credit_id, null, 'card_payment', 6200, 0, anchor_date + 13, 'draft', 'synthetic'),
    ('37073cce-5418-5aa4-84da-04faa2260586'::uuid, target_user, checking_id, null, null, '9fbebc47-170c-5405-b8b0-a8e59b34926d'::uuid, 'debt_payment', 2000, 0, anchor_date + 8, 'draft', 'synthetic')
    on conflict (id) do nothing;

  insert into public.transfers(id, user_id, from_account_id, to_account_id, amount, status, note)
    values('65ee0058-beb8-5220-a3c8-5f6c026b7a65'::uuid, target_user, checking_id, savings_id, 500, 'simulated', 'Ejemplo MVP: simulación, sin movimiento de dinero')
    on conflict (id) do nothing;

  select t.id, t.account_id into disputed_id, disputed_account from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = target_user and t.direction = 'debit' order by t.occurred_at desc, t.id limit 1;
  if disputed_id is not null then
    insert into public.transaction_disputes(id, user_id, account_id, transaction_id, reason, status, data_origin) values
      ('28d1eac0-3bee-541a-afd5-1ff8788444b6'::uuid, target_user, disputed_account, disputed_id, 'Borrador ficticio para probar la revisión de un cargo. No es una denuncia real.', 'draft', 'synthetic')
      on conflict (id) do nothing;
  end if;

  previous_start := (date_trunc('month', anchor_date) - interval '1 month')::date;
  previous_end := date_trunc('month', anchor_date)::date - 1;
  select coalesce(sum(t.amount) filter (where t.direction = 'credit'), 0), coalesce(sum(t.amount) filter (where t.direction = 'debit'), 0)
    into income, expenses from public.transactions t
    where t.account_id = checking_id and (t.occurred_at at time zone 'America/Monterrey')::date between previous_start and previous_end;
  insert into public.bank_statements(id, user_id, account_id, period_start, period_end, opening_balance, total_income, total_expenses, closing_balance, document_status, data_origin) values
    ('2944bf9f-d592-55fc-b350-e52898c58e6a'::uuid, target_user, checking_id, previous_start, previous_end, 10000, income, expenses, 10000 + income - expenses, 'metadata_only', 'synthetic')
    on conflict (id) do nothing;

  insert into public.financial_alerts(id, user_id, account_id, budget_id, title, message, kind, threshold_amount, due_date, data_origin) values
    ('abf32749-cf89-502c-a354-7cebe2d42d47'::uuid, target_user, checking_id, null, 'Saldo bajo', 'Aviso de ejemplo si el saldo disponible baja de $1,000.', 'low_balance', 1000, null, 'synthetic'),
    ('1edfd0fc-8155-59d5-8b2b-ec069b0fdfb8'::uuid, target_user, null, '389777c0-efa8-5ca1-b154-625482217d56'::uuid, 'Revisa tu presupuesto de comida', 'Aviso de ejemplo al acercarte al límite semanal.', 'budget_limit', 720, null, 'synthetic'),
    ('255d318d-3556-52ac-8346-9a611e4663b4'::uuid, target_user, credit_id, null, 'Próximo pago de tarjeta', 'Recordatorio de ejemplo del pago de tarjeta; no envía notificaciones externas.', 'payment_due', null, anchor_date + 13, 'synthetic')
    on conflict (id) do nothing;
end;
$seed$;
commit;

-- Verify the created data (counts only).
select 'account_details' as table_name, count(*) as user_rows from public.account_details where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'cards' as table_name, count(*) as user_rows from public.cards where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'credit_card_terms' as table_name, count(*) as user_rows from public.credit_card_terms where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'debts' as table_name, count(*) as user_rows from public.debts where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'debt_scenarios' as table_name, count(*) as user_rows from public.debt_scenarios where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'budgets' as table_name, count(*) as user_rows from public.budgets where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'savings_goals' as table_name, count(*) as user_rows from public.savings_goals where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'savings_contributions' as table_name, count(*) as user_rows from public.savings_contributions where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'scheduled_cash_flows' as table_name, count(*) as user_rows from public.scheduled_cash_flows where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'beneficiaries' as table_name, count(*) as user_rows from public.beneficiaries where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'payment_orders' as table_name, count(*) as user_rows from public.payment_orders where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'transaction_disputes' as table_name, count(*) as user_rows from public.transaction_disputes where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'bank_statements' as table_name, count(*) as user_rows from public.bank_statements where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
union all
select 'financial_alerts' as table_name, count(*) as user_rows from public.financial_alerts where user_id = 'f52827d7-0213-4df4-9621-14775d6228d4'::uuid
order by table_name;
