// Runs only against disposable, in-memory PostgreSQL. No network or real credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const user = 'f52827d7-0213-4df4-9621-14775d6228d4';
const other = '10000000-0000-4000-8000-000000000001';
const checking = '20000000-0000-4000-8000-000000000001';
const credit = '20000000-0000-4000-8000-000000000002';
const foreignAccount = '20000000-0000-4000-8000-000000000003';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const migration = read('../migrations/202609120001_financial_question_bank.sql');
const primaryAccountMigration = read('../migrations/202609130003_primary_account_context.sql');
const seed = read('../seeds/financial_demo_f52827d7.sql');
const tables = [...migration.matchAll(/create table public\.(\w+)/g)].map(match => match[1]);

const bootstrap = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  create table public.users(id uuid primary key);
  create table public.accounts(
    id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
    account_type text not null check(account_type in ('checking','credit','savings')),
    currency text not null default 'MXN', available_balance numeric not null default 0, created_at timestamptz not null default now());
  create table public.transactions(
    id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id),
    amount numeric not null, direction text not null, category text not null, merchant text, occurred_at timestamptz not null default now(), is_demo boolean not null default true);
  create table public.transfers(
    id uuid primary key, user_id uuid not null references public.users(id),
    from_account_id uuid references public.accounts(id), to_account_id uuid references public.accounts(id),
    amount numeric not null, status text not null, note text, created_at timestamptz default now(), executed_at timestamptz);
  insert into public.users values ('${user}'), ('${other}');
  insert into public.accounts(id,user_id,account_type,available_balance) values
    ('${checking}','${user}','checking',780.50), ('${credit}','${user}','credit',1500), ('${foreignAccount}','${other}','checking',88888);
  insert into public.transactions(account_id,amount,direction,category,occurred_at) values
    ('${checking}',200,'debit','groceries',now()), ('${checking}',300,'debit','groceries',now()-interval '8 months'),
    ('${foreignAccount}',50000,'debit','groceries',now());
  grant select on public.accounts, public.transactions to authenticated;
`;
await db.exec(bootstrap);

const originalAccounts = (await db.query('select * from public.accounts order by id')).rows;
await db.exec(migration);
assert.equal(tables.length, 14);
console.log('PASS: 14 tables and 2 derived views created.');
await db.exec(seed);
const counts = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n)])));
const firstCounts = await counts();
await db.exec(seed);
assert.deepEqual(await counts(), firstCounts);
assert.deepEqual((await db.query('select * from public.accounts where id = any($1::uuid[]) order by id', [originalAccounts.map(a => a.id)])).rows, originalAccounts);
assert.equal(Number((await db.query('select count(*) as n from public.accounts')).rows[0].n), 4);
console.log('PASS: rerunning seed creates no duplicates and preserves all previous account balances.');
const progress = (await db.query("select spent_amount from public.budget_progress where category='groceries'")).rows;
assert.equal(Number(progress[0].spent_amount), 200);
const goals = (await db.query('select name,saved_amount,remaining_amount from public.savings_goal_progress order by name')).rows;
assert.deepEqual(goals.map(g => Number(g.saved_amount)).sort((a,b)=>a-b), [1800,7200]);
assert.equal((await db.query('select * from public.debt_scenarios where total_paid <> total_interest + 25000')).rows.length, 0);
assert.equal((await db.query("select * from public.bank_statements where document_status='available'")).rows.length, 0);
assert.equal((await db.query("select * from public.payment_orders where status <> 'draft'")).rows.length, 0);
console.log('PASS: budget periods/owners, contribution totals, scenario totals and truthful draft/document states.');

// Even the trusted writer cannot accidentally relate two users' records.
await assert.rejects(db.query(`insert into public.budgets(user_id,account_id,name,category,limit_amount,period_type,start_date,end_date)
 values($1,$2,'Wrong owner','groceries',100,'monthly',current_date,current_date)`, [user,foreignAccount]), error => error.code === '23503');
await assert.rejects(db.query(`insert into public.budgets(user_id,name,category,limit_amount,period_type,start_date,end_date)
 values($1,'Bad limit','groceries',0,'monthly',current_date,current_date)`, [user]), error => error.code === '23514');
console.log('PASS: cross-user foreign keys and invalid amounts are rejected.');

await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
await db.exec('set role authenticated');
for (const table of tables) assert.equal(Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n), firstCounts[table]);
assert.equal((await db.query('select * from public.budget_progress')).rows.length, 3);
await assert.rejects(db.query('update public.credit_card_terms set current_debt = 0'), error => error.code === '42501');
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
for (const table of tables) assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0);
assert.equal((await db.query('select * from public.budget_progress')).rows.length, 0);
assert.equal((await db.query('select * from public.savings_goal_progress')).rows.length, 0);
await db.exec('reset role; set role anon');
await assert.rejects(db.query('select * from public.account_details'), error => error.code === '42501');
await db.exec('reset role');
console.log('PASS: own-user SELECT, no cross-user reads, no anonymous reads and no client writes to credit terms.');
await db.exec(primaryAccountMigration);
await db.exec(primaryAccountMigration);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
await db.exec('set role authenticated');
assert.equal((await db.query('select public.get_primary_account_id() as id')).rows[0].id, checking);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
assert.equal((await db.query('select public.get_primary_account_id() as id')).rows[0].id, foreignAccount);
await db.exec('reset role; set role anon');
await assert.rejects(db.query('select public.get_primary_account_id()'), error => error.code === '42501');
await db.exec('reset role');
console.log('PASS: Expo receives only its primary account UUID through the authenticated RPC.');
console.log(JSON.stringify({seedRows:firstCounts},null,2));
await db.close();

const combined = new PGlite();
await combined.exec(bootstrap);
await combined.exec(read('../financial_question_bank.sql'));
assert.equal(Number((await combined.query('select count(*) as n from public.budgets')).rows[0].n), 3);
await combined.close();
console.log('PASS: the final single-file SQL executes successfully.');
const absent = new PGlite();
await absent.exec(bootstrap);
await absent.query('delete from public.transactions where account_id in (select id from public.accounts where user_id = $1)', [user]);
await absent.query('delete from public.accounts where user_id = $1', [user]);
await absent.query('delete from public.users where id = $1', [user]);
await assert.rejects(absent.exec(read('../financial_question_bank.sql')), /requested application user does not exist/);
await absent.exec('rollback');
assert.equal((await absent.query("select to_regclass('public.budgets') as table_name")).rows[0].table_name, null);
await absent.close();
console.log('PASS: an absent target user rolls back all new schema and data.');
