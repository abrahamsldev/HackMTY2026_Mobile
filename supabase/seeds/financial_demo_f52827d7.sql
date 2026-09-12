-- Synthetic data ONLY for f52827d7-0213-4df4-9621-14775d6228d4. No existing row is overwritten.
-- Run after 202609120001_financial_question_bank.sql. Safe to rerun (stable IDs).
-- CLABEs below are deliberately fictitious, not usable banking identifiers.
-- This file does not create Auth users, transfer money or submit external reports.
begin;
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
