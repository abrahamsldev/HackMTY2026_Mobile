import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bankingViewSchema, ownedBalance, budgetProgress, creditUtilization, daysUntil, filterTransactions, transactionDay, trendDelta } from '../src/features/financial-ui/model.ts';
import { z } from 'zod';
import { A2UI_BANKING_CATALOG_ID } from '../src/features/a2ui/types.ts';
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

test('the exported schema still matches the copy MCP packages as Finance v2', () => {
  // MCP owns https://fluidbank.app/a2ui/catalogs/finance/v2 and packages this exact
  // document. Editing the Zod contract without re-running the export and copying the
  // result into the MCP catalogs directory would silently split the two repositories.
  const exported = { $id: `${A2UI_BANKING_CATALOG_ID}/banking-view.schema.json`, ...z.toJSONSchema(bankingViewSchema, { io: 'input' }) };
  assert.deepEqual(exported, read('./fixtures/finance-v2-banking-view.schema.json'));
  assert.equal(JSON.stringify(exported).includes('$ref'), false);
});

test('a balance answer carries the masked cards behind the totals', () => {
  const data = bankingViewSchema.parse(example('financial-summary'));
  assert.equal(data.totalOwnedBalance, ownedBalance(data.accounts));
  assert.deepEqual(data.cards.map(card => card.cardType), ['debit', 'credit']);
  // Only the tail travels: a card number, CVV or full expiry has no property to ride in.
  for (const field of [{ pan: '4111111111111111' }, { cvv: '123' }, { expires: '2028-11-04' }, { lastFour: '4111111111111111' }]) {
    const invalid = example('financial-summary');
    invalid.cards[0] = { ...invalid.cards[0], ...field };
    assert.equal(bankingViewSchema.safeParse(invalid).success, false);
  }
  const orphan = example('financial-summary');
  orphan.cards[0].accountId = 'not-an-account-of-this-summary';
  assert.equal(bankingViewSchema.safeParse(orphan).success, false);
});

test('credit terms stay internally consistent or the view is rejected', () => {
  const data = bankingViewSchema.parse(example('credit-card'));
  assert.deepEqual(creditUtilization(data.debt, data.creditLimit), { percentage: 85, level: 'high' });
  const overLimit = example('credit-card');
  overLimit.availableCredit = overLimit.creditLimit + 1;
  assert.equal(bankingViewSchema.safeParse(overLimit).success, false);
  const lateCutoff = example('credit-card');
  lateCutoff.cutoffDate = '2026-09-26';
  assert.equal(bankingViewSchema.safeParse(lateCutoff).success, false);
  const debitCard = example('credit-card');
  debitCard.card.cardType = 'debit';
  assert.equal(bankingViewSchema.safeParse(debitCard).success, false);
  const mismatched = example('card-security');
  mismatched.card.status = 'blocked';
  assert.equal(bankingViewSchema.safeParse(mismatched).success, false);
});

test('the spending headline is the producer\'s total and never contradicts its slices', () => {
  const data = bankingViewSchema.parse(example('spending-analysis'));
  assert.equal(data.totalSpent, 15000);
  assert.deepEqual(trendDelta(data.totalSpent, data.previousTotal), { amount: 1000, percentage: 1000 / 14000 * 100, direction: 'up' });
  const inflated = example('spending-analysis');
  inflated.totalSpent = 100;
  assert.equal(bankingViewSchema.safeParse(inflated).success, false);
});

test('the payment countdown reads calendar days in Monterrey, not UTC instants', () => {
  assert.equal(daysUntil('2026-09-25', new Date('2026-09-12T02:00:00Z')), 14);
  assert.equal(daysUntil('2026-09-12', new Date('2026-09-12T18:00:00Z')), 0);
  assert.equal(daysUntil('2026-09-10', new Date('2026-09-12T18:00:00Z')), -2);
});
