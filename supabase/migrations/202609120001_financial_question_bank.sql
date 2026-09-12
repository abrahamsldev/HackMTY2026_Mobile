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
commit;
