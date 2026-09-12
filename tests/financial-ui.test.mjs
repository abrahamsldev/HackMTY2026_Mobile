import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bankingViewSchema, ownedBalance, budgetProgress, filterTransactions, transactionDay } from '../src/features/financial-ui/model.ts';
import { financialViewCatalog } from '../src/features/financial-ui/catalog.ts';
import { bankingViewMessages } from '../src/features/financial-ui/a2ui.ts';
import { A2UIMessageProcessor } from '../src/features/a2ui/message-processor.ts';
import { buildRenderPlan } from '../src/features/a2ui/catalog.ts';
import { parseAgentReply } from '../src/features/assistant/agent.ts';
import { A2UI_BASIC_CATALOG_ID, A2UI_FINANCE_CATALOG_ID } from '../src/features/a2ui/types.ts';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const bank = read('../src/features/assistant/question-bank.json');
const examples = read('../src/features/financial-ui/examples.json');
const example = intent => structuredClone(examples.find(v => v.intent === intent));

test('every question-bank category has exactly one UI design and a validated example', () => {
  assert.equal(bank.length, 13);
  assert.deepEqual(examples.map(v => v.intent).sort(), bank.map(v => v.id).sort());
  assert.deepEqual(Object.keys(financialViewCatalog).sort(), bank.map(v => v.id).sort());
});

for (const input of examples) {
  test(`${input.intent}: agent transport → A2UI processor → BankingView`, () => {
    const value = bankingViewSchema.parse(input);
    const reply = parseAgentReply({ message: 'Vista disponible', data: {}, a2ui: { resource_uri: `a2ui://banking/${value.intent}`, messages: bankingViewMessages(value) } });
    assert.equal(reply.a2uiError, null);
    const result = new A2UIMessageProcessor().process(reply.messages);
    assert.equal(result.ok, true);
    const plan = buildRenderPlan(result.surfaces[0]);
    assert.equal(plan.status, 'ready');
    assert.equal(plan.component.component, 'BankingView');
    assert.deepEqual(result.surfaces[0].dataModel.view, value);
    const empty = bankingViewSchema.parse({ intent: value.intent, title: value.title, state: 'empty', description: 'No hay información para esta consulta.' });
    assert.equal(new A2UIMessageProcessor().process(bankingViewMessages(empty)).ok, true);
  });
}

test('banking views require their own versioned catalog and invalid bound data stays atomic', () => {
  const messages = bankingViewMessages(bankingViewSchema.parse(example('budgets')));
  for (const catalogId of [A2UI_BASIC_CATALOG_ID, A2UI_FINANCE_CATALOG_ID]) {
    const invalid = structuredClone(messages);
    invalid[0].createSurface.catalogId = catalogId;
    assert.equal(new A2UIMessageProcessor().process(invalid).ok, false);
  }
  const processor = new A2UIMessageProcessor();
  const initial = processor.process(messages);
  const badUpdate = { version: 'v0.9.1', updateDataModel: { surfaceId: messages[0].createSurface.surfaceId, path: '/view/budgets/0/limit', value: 0 } };
  const rejected = processor.process([badUpdate]);
  assert.equal(rejected.ok, false);
  assert.deepEqual(rejected.surfaces, initial.surfaces);
});

test('money owned excludes available credit, even when credit exceeds cash', () => {
  const data = bankingViewSchema.parse(example('financial-summary'));
  assert.equal(ownedBalance(data.accounts), 20500);
  assert.equal(ownedBalance(data.accounts.filter(a => a.accountType === 'credit')), 0);
});

test('budgets distinguish overspending from remaining budget and clamp only the visual bar', () => {
  assert.deepEqual(budgetProgress(650, 600), { percentage: 100, remaining: -50 });
  assert.deepEqual(budgetProgress(780, 1000), { percentage: 78, remaining: 220 });
});

test('transaction search ignores accents and combines with income/expense filtering', () => {
  const rows = bankingViewSchema.parse(example('transactions')).transactions;
  assert.equal(filterTransactions(rows, 'cafe', 'expense')[0].title, 'Café del centro');
  assert.equal(filterTransactions(rows, 'cafe', 'income').length, 0);
  assert.equal(filterTransactions(rows, 'inexistente', 'all').length, 0);
});

test('yesterday uses Monterrey dates across UTC midnight and rejects out-of-period rows', () => {
  assert.equal(transactionDay('2026-09-12T02:00:00Z'), '2026-09-11');
  const data = example('transactions');
  data.transactions[0].occurredAt = '2026-09-12T02:00:00Z';
  assert.equal(bankingViewSchema.safeParse(data).success, true);
  data.transactions[0].occurredAt = '2026-09-12T18:00:00Z';
  assert.equal(bankingViewSchema.safeParse(data).success, false);
});

test('network inputs reject missing data, sensitive identifiers, duplicates, NaN and excessive lists', () => {
  const info = example('banking-information');
  info.maskedClabe = '012345678901234567';
  assert.equal(bankingViewSchema.safeParse(info).success, false);
  assert.equal(bankingViewSchema.safeParse({ ...example('transfers'), onConfirm: 'executeTransfer' }).success, false);
  assert.equal(bankingViewSchema.safeParse({ ...example('transfers'), amount: NaN }).success, false);
  assert.equal(bankingViewSchema.safeParse({ intent: 'credit-card', title: 'Sin datos' }).success, false);
  const transactions = example('transactions');
  transactions.transactions.push(transactions.transactions[0]);
  assert.equal(bankingViewSchema.safeParse(transactions).success, false);
  const oversized = example('savings-goals');
  oversized.goals = Array.from({ length: 31 }, (_, i) => ({ ...oversized.goals[0], id: String(i) }));
  assert.equal(bankingViewSchema.safeParse(oversized).success, false);
});
