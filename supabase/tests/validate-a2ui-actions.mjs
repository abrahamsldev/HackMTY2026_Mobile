import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const uid = 'f52827d7-0213-4df4-9621-14775d6228d4';
const other = '00000000-0000-4000-8000-000000000002';
await db.exec(`
  create role anon; create role authenticated; create role mcp_reader;
  create table public.users(id uuid primary key);
  insert into public.users values ('${uid}'), ('${other}');
  create table public.accounts(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), account_type text not null, currency text not null default 'MXN', available_balance numeric not null, unique(user_id,id));
  create table public.account_details(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), account_id uuid unique, display_name text not null, last_four text, clabe text, foreign key(user_id,account_id) references public.accounts(user_id,id), unique(user_id,id));
  create table public.cards(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), account_id uuid not null, display_name text not null, card_type text not null, network text not null, last_four text not null, status text not null, expires_month smallint, expires_year smallint, foreign key(user_id,account_id) references public.accounts(user_id,id), unique(user_id,id));
  create table public.credit_card_terms(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), account_id uuid unique, currency text not null default 'MXN', credit_limit numeric not null, current_debt numeric not null, statement_balance numeric not null, minimum_payment numeric not null, interest_free_payment numeric not null, annual_interest_rate numeric not null, cat_percentage numeric, cutoff_date date not null, due_date date not null, as_of date not null, foreign key(user_id,account_id) references public.accounts(user_id,id), unique(user_id,id));
  create table public.beneficiaries(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), display_name text not null, bank_name text not null, last_four text not null, status text not null, unique(user_id,id));
  create table public.transactions(id uuid primary key default gen_random_uuid(), account_id uuid references public.accounts(id), amount numeric not null, direction text not null, category text not null, merchant text not null, occurred_at timestamptz not null default now());
  create table public.payment_orders(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), from_account_id uuid not null, beneficiary_id uuid, target_account_id uuid, debt_id uuid, kind text not null, amount numeric not null, fee numeric not null default 0, currency text not null default 'MXN', requested_date date, status text not null default 'draft' check(status in ('draft','awaiting_confirmation','simulated','cancelled')), data_origin text not null default 'user', created_at timestamptz not null default now(), foreign key(user_id,from_account_id) references public.accounts(user_id,id), foreign key(user_id,beneficiary_id) references public.beneficiaries(user_id,id), foreign key(user_id,target_account_id) references public.accounts(user_id,id), unique(user_id,id));
  create table public.budgets(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), name text not null, category text not null, currency text default 'MXN', limit_amount numeric check(limit_amount>0), period_type text, start_date date, end_date date check(end_date>=start_date));
  create table public.savings_goals(id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id), name text not null, currency text default 'MXN', target_amount numeric check(target_amount>0), target_date date, suggested_monthly_contribution numeric check(suggested_monthly_contribution>=0));
  alter table public.budgets enable row level security;
  alter table public.savings_goals enable row level security;
  insert into public.accounts(id,user_id,account_type,currency,available_balance) values
    ('10000000-0000-4000-8000-000000000001','${uid}','checking','MXN',10000),
    ('10000000-0000-4000-8000-000000000002','${uid}','credit','MXN',1500),
    ('10000000-0000-4000-8000-000000000004','${uid}','savings','MXN',2000),
    ('10000000-0000-4000-8000-000000000003','${other}','checking','MXN',10000);
  insert into public.account_details(user_id,account_id,display_name,last_four,clabe) values
    ('${uid}','10000000-0000-4000-8000-000000000001','Cuenta principal','1111','000000000000001111'),
    ('${uid}','10000000-0000-4000-8000-000000000002','Tarjeta oro','2222',null),
    ('${uid}','10000000-0000-4000-8000-000000000004','Cuenta de ahorro','4444','000000000000004444'),
    ('${other}','10000000-0000-4000-8000-000000000003','Cuenta ajena','3333','000000000000004321');
  alter table public.beneficiaries add column clabe text;
  insert into public.beneficiaries(id,user_id,display_name,bank_name,last_four,clabe,status) values
    ('20000000-0000-4000-8000-000000000001','${uid}','Ana','Banco receptor','4321','000000000000004321','verified');
  insert into public.cards(id,user_id,account_id,display_name,card_type,network,last_four,status) values
    ('30000000-0000-4000-8000-000000000001','${uid}','10000000-0000-4000-8000-000000000002','Tarjeta oro','credit','visa','2222','active');
  insert into public.credit_card_terms(user_id,account_id,currency,credit_limit,current_debt,statement_balance,minimum_payment,interest_free_payment,annual_interest_rate,cutoff_date,due_date,as_of) values
    ('${uid}','10000000-0000-4000-8000-000000000002','MXN',10000,8500,6200,420,6200,42,'2026-09-01','2026-09-25','2026-09-13');
`);
const sql = readFileSync(new URL('../migrations/202609130001_a2ui_actions.sql', import.meta.url), 'utf8');
const moneySql = readFileSync(new URL('../migrations/202609130002_transfer_and_card_payment_actions.sql', import.meta.url), 'utf8');
const internalTransferSql = readFileSync(new URL('../migrations/202609130004_internal_transfer_balances.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(sql);
await db.exec(moneySql);
await db.exec(moneySql);
await db.exec(internalTransferSql);
await db.exec(internalTransferSql);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
await db.exec('set role mcp_reader');
assert.equal((await db.query('select count(*)::int n from public.cards')).rows[0].n, 1);
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
await db.exec('set role mcp_reader');
assert.equal((await db.query('select count(*)::int n from public.cards')).rows[0].n, 0);
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
await db.exec('set role fluidbank_actions');
const budget = { name: 'Comida', category: 'groceries', limit_amount: 3000, start_date: '2026-09-13', end_date: '2026-10-13' };
const invoke = (name, key, context, hash = 'b'.repeat(64)) => db.query('select public.apply_a2ui_action($1,$2,$3,$4::jsonb) as result', [name, key.repeat(64), hash, JSON.stringify(context)]);
const first = (await invoke('budget.create', 'a', budget)).rows[0].result;
assert.deepEqual((await invoke('budget.create', 'a', budget)).rows[0].result, first);
assert.equal((await db.query('select count(*)::int n from public.budgets')).rows[0].n, 1);
await assert.rejects(invoke('budget.create', 'a', budget, 'c'.repeat(64)), /idempotency_conflict/);
await invoke('budget.update', 'd', { ...budget, id: first.id, limit_amount: 4500 });
assert.equal(Number((await db.query('select limit_amount from public.budgets')).rows[0].limit_amount), 4500);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
assert.equal((await db.query('select * from public.budgets')).rows.length, 0);
await assert.rejects(invoke('budget.update', 'e', { ...budget, id: first.id }), /record_not_available/);
assert.equal((await db.query('select * from public.a2ui_action_receipts')).rows.length, 0);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
const goal = { name: 'Laptop', target_amount: 18000, target_date: '2027-01-01', suggested_monthly_contribution: 1500 };
const savedGoal = (await invoke('savings_goal.create', 'f', goal)).rows[0].result;
await invoke('savings_goal.update', 'g', { ...goal, id: savedGoal.id, target_amount: 20000 });
assert.equal(Number((await db.query('select target_amount from public.savings_goals')).rows[0].target_amount), 20000);
await assert.rejects(invoke('budget.create', 'h', { ...budget, limit_amount: -1 }));
assert.equal((await db.query('select count(*)::int n from public.a2ui_action_receipts')).rows[0].n, 4);
const transfer = { source_account: 'Cuenta principal', recipient: 'Ana', amount: 500, concept: 'Comida' };
const savedTransfer = (await invoke('transfer.execute', 'k', transfer)).rows[0].result;
assert.equal(savedTransfer.kind, 'transfer');
assert.equal(Number((await db.query("select available_balance from public.accounts where id='10000000-0000-4000-8000-000000000001'")).rows[0].available_balance), 9500);
assert.equal(Number((await db.query("select available_balance from public.accounts where id='10000000-0000-4000-8000-000000000003'")).rows[0].available_balance), 10500);
assert.deepEqual((await invoke('transfer.execute', 'k', transfer)).rows[0].result, savedTransfer);
assert.equal((await db.query("select count(*)::int n from public.payment_orders where kind='transfer' and status='completed'")).rows[0].n, 1);
const payment = { source_account: 'Cuenta principal', card: 'Tarjeta oro', amount: 2000 };
const savedPayment = (await invoke('credit_card.pay', 'l', payment)).rows[0].result;
assert.equal(savedPayment.kind, 'card_payment');
assert.equal(Number((await db.query("select available_balance from public.accounts where id='10000000-0000-4000-8000-000000000001'")).rows[0].available_balance), 7500);
assert.equal(Number((await db.query('select current_debt from public.credit_card_terms')).rows[0].current_debt), 6500);
assert.equal(Number((await db.query("select available_balance from public.accounts where id='10000000-0000-4000-8000-000000000002'")).rows[0].available_balance), 3500);
await assert.rejects(invoke('transfer.execute', 'm', { ...transfer, amount: 8000 }), /insufficient_funds/);
const internal = { ...transfer, recipient: 'Cuenta de ahorro', amount: 1000, concept: 'Ahorro' };
await invoke('transfer.execute', 'n', internal);
assert.equal(Number((await db.query("select available_balance from public.accounts where id='10000000-0000-4000-8000-000000000004'")).rows[0].available_balance), 3000);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from public.transactions')).rows[0].n, 5);
await db.exec('set role fluidbank_actions');
await assert.rejects(invoke('execute_sql', 'i', {}), /unknown_action/);
await db.exec('reset role; set role authenticated');
await assert.rejects(invoke('budget.create', 'j', budget), /permission denied/);
await db.exec('reset role');
await db.close();
console.log('PASS: migration rerun, create/update, transfer/payment ledgers, RLS isolation, idempotency, rollback and denied client writes.');
