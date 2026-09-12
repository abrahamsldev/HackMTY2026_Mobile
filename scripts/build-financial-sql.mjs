// Produces one reviewable SQL Editor script. No database connection is used.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../supabase/', import.meta.url);
const migration = readFileSync(new URL('migrations/202609120001_financial_question_bank.sql', root), 'utf8');
const seed = readFileSync(new URL('seeds/financial_demo_f52827d7.sql', root), 'utf8');
const tables = [...migration.matchAll(/create table public\.(\w+)/g)].map(match => match[1]);
if (!migration.endsWith('commit;\n') || !seed.includes('\nbegin;\n')) throw new Error('Unexpected transaction boundaries');
const userId = 'f52827d7-0213-4df4-9621-14775d6228d4';
const verification = tables.map(table => `select '${table}' as table_name, count(*) as user_rows from public.${table} where user_id = '${userId}'::uuid`).join('\nunion all\n');
const script = [
  '-- HACKMTY MVP: tables + synthetic data. Paste this entire file into Supabase SQL Editor.\n',
  '-- Target user: f52827d7-0213-4df4-9621-14775d6228d4\n',
  '-- Apply once. A failure rolls back the schema and seed together. No existing rows are overwritten.\n',
  '-- No real payments, bank reports, notifications or downloadable documents are created.\n\n',
  migration.slice(0, -'commit;\n'.length),
  '\n-- SYNTHETIC DATA FOR THE REQUESTED USER\n',
  seed.replace('\nbegin;\n', '\n'),
  '\n-- Verify the created data (counts only).\n',
  verification, '\norder by table_name;\n',
].join('');
writeFileSync(new URL('financial_question_bank.sql', root), script);
console.log(`Built one atomic SQL script: ${tables.length} tables, 2 views and the target user's seed.`);
