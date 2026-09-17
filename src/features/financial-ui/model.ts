import { z } from 'zod';
import { areaChartPropsSchema } from '../../components/charts/area-chart-model.ts';
import { heatmapChartPropsSchema } from '../../components/charts/heatmap-chart-model.ts';

export const intentIds = ['financial-summary', 'transactions', 'spending-analysis', 'cash-flow',
  'budgets', 'recurring-payments', 'credit-card', 'debts', 'transfers', 'card-security',
  'savings-goals', 'banking-information', 'financial-education'] as const;
export type FinancialViewIntent = typeof intentIds[number];
const label = z.string().trim().min(1).max(120);
const description = z.string().trim().min(1).max(600);
const id = z.string().min(1).max(128);
const money = z.number().finite().min(0).max(1e12);
const signedMoney = z.number().finite().min(-1e12).max(1e12);
const day = z.iso.date();
const lastFour = z.string().regex(/^\d{4}$/);
// Percentage points, like `credit_card_terms.annual_interest_rate`; never a fraction.
const rate = z.number().finite().min(0).max(1000);
const common = { title: label, subtitle: description.optional(), currency: z.enum(['MXN', 'USD']).default('MXN') };

export function transactionDay(occurredAt: string): string {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Monterrey' }).formatToParts(new Date(occurredAt));
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
/**
 * Why one movement is singled out. It is the same closed vocabulary the agent
 * may set as a presentation option, so a focused question ("mi mayor compra del
 * mes pasado") arrives as data the client can label, never as prose to parse.
 */
export const transactionFocusSchema = z.enum(['largest', 'smallest', 'latest', 'recurring']);
export type TransactionFocus = z.infer<typeof transactionFocusSchema>;

export const transactionSchema = z.object({
  transactionId: id, title: label, description: description.optional(), amount: signedMoney,
  occurredAt: z.iso.datetime({ offset: true }),
  category: z.enum(['food', 'transport', 'entertainment', 'utilities', 'health', 'shopping', 'income', 'transfer', 'other']),
  status: z.enum(['pending', 'completed', 'declined']).default('completed'),
}).strict();
const accountSchema = z.object({
  accountId: id, accountName: label, accountType: z.enum(['checking', 'savings', 'credit']),
  accountLastFour: lastFour.optional(), availableBalance: signedMoney,
  status: z.enum(['active', 'blocked', 'inactive']).default('active'),
}).strict();
// The plastic itself, mirroring `cards`. Only the masked tail travels: never a PAN,
// CVV, expiry day or cardholder document.
export const paymentCardSchema = z.object({
  cardId: id, cardName: label, cardType: z.enum(['debit', 'credit']),
  network: z.enum(['visa', 'mastercard', 'amex', 'other']), lastFour,
  status: z.enum(['active', 'blocked', 'inactive']).default('active'),
  expires: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), accountId: id.optional(),
}).strict();
const scheduleItem = z.object({ id, name: label, date: day, amount: money, direction: z.enum(['income', 'expense']) }).strict();
const scenario = z.object({ id, name: label, monthlyPayment: money, months: z.number().int().min(1).max(600), totalInterest: money }).strict();
const goal = z.object({ id, name: label, saved: money, target: money.positive(), targetDate: day, monthlyContribution: money }).strict();
const unique = <T extends z.ZodType>(schema: T, key: string, max = 30) => z.array(schema).max(max)
  .refine((rows) => new Set(rows.map((row) => (row as Record<string, unknown>)[key])).size === rows.length, 'Identificadores duplicados.');

export const readyBankingViewSchema = z.discriminatedUnion('intent', [
  // MCP owns Finance v2 and requires this total, and the agent always sends it:
  // the client mirrors that instead of recomputing a headline from a list it may
  // only have part of.
  z.object({ ...common, intent: z.literal('financial-summary'), totalOwnedBalance: signedMoney,
    accounts: unique(accountSchema, 'accountId'), income: money.optional(), expenses: money.optional(),
    cards: unique(paymentCardSchema, 'cardId', 12).optional(),
  }).strict()
    .refine(v => (v.cards ?? []).every(card => card.accountId === undefined || v.accounts.some(a => a.accountId === card.accountId)),
      'Hay tarjetas que no pertenecen a ninguna cuenta del resumen.'),
  z.object({ ...common, intent: z.literal('transactions'), startDate: day, endDate: day, timeZone: z.literal('America/Monterrey'), transactions: unique(transactionSchema, 'transactionId', 100),
    // One movement the answer is about, drawn above the list. The id must be in
    // the list: a highlight of a row the user cannot see would be an estimate.
    highlight: z.object({ transactionId: id, focus: transactionFocusSchema }).strict().optional(),
  }).strict()
    .refine((v) => v.startDate <= v.endDate, 'Periodo inválido.')
    .refine((v) => !v.highlight || v.transactions.some((t) => t.transactionId === v.highlight!.transactionId), 'El movimiento destacado no está en la lista.')
    .refine(v => v.transactions.every(row => {
      if (!Number.isFinite(new Date(row.occurredAt).getTime())) return false;
      const localDay = transactionDay(row.occurredAt);
      return localDay >= v.startDate && localDay <= v.endDate;
    }), 'Hay movimientos fuera del periodo solicitado.'),
  z.object({ ...common, intent: z.literal('spending-analysis'), totalSpent: money, categories: z.array(z.object({
    category: z.enum(['food', 'transport', 'entertainment', 'utilities', 'health', 'shopping', 'transfer', 'other']), amount: money,
  }).strict()).max(8).refine((v) => new Set(v.map(c => c.category)).size === v.length), previousTotal: money.optional(), insight: description.optional(),
    trend: areaChartPropsSchema.optional(), activity: heatmapChartPropsSchema.refine(v => v.data.length <= 366).optional(),
  }).strict()
    // The headline may exceed the breakdown when categories are truncated, but the
    // visible slices can never add up to more than the total they belong to.
    .refine(v => v.categories.reduce((total, row) => total + row.amount, 0) <= v.totalSpent + 0.01,
      'Las categorías suman más que el gasto total del periodo.'),
  z.object({ ...common, intent: z.literal('cash-flow'), projectedBalance: signedMoney, targetDate: day, assumptions: description,
    projection: areaChartPropsSchema, upcoming: unique(scheduleItem, 'id'),
  }).strict(),
  z.object({ ...common, intent: z.literal('budgets'), budgets: unique(z.object({
    id, name: label, spent: money, limit: money.positive(), period: label, status: z.enum(['active', 'paused']),
  }).strict(), 'id') }).strict(),
  z.object({ ...common, intent: z.literal('recurring-payments'), payments: unique(z.object({
    id, name: label, amount: money, nextDate: day, cycle: z.enum(['weekly', 'monthly', 'yearly']), status: z.enum(['active', 'paused']),
  }).strict(), 'id') }).strict(),
  z.object({ ...common, intent: z.literal('credit-card'), cardName: label, lastFour: lastFour.optional(),
    debt: money, availableCredit: money, minimumPayment: money, interestFreePayment: money, dueDate: day,
    card: paymentCardSchema.optional(), creditLimit: money.positive().optional(), statementBalance: money.optional(),
    cutoffDate: day.optional(), annualInterestRate: rate.optional(), catPercentage: rate.optional(),
  }).strict()
    .refine(v => v.creditLimit === undefined || v.creditLimit >= v.availableCredit, 'El crédito disponible no puede superar el límite.')
    .refine(v => v.cutoffDate === undefined || v.cutoffDate <= v.dueDate, 'La fecha de corte debe ser anterior o igual a la fecha límite.')
    .refine(v => v.card === undefined || v.card.cardType === 'credit', 'Esta vista solo acepta una tarjeta de crédito.')
    .refine(v => v.card === undefined || v.lastFour === undefined || v.card.lastFour === v.lastFour, 'La terminación no coincide con la tarjeta.'),
  z.object({ ...common, intent: z.literal('debts'), outstanding: money, assumptions: description, scenarios: unique(scenario, 'id', 4).min(1) }).strict(),
  z.object({ ...common, intent: z.literal('transfers'), source: label, recipient: label, amount: money.positive(), fee: money, scheduledDate: day.optional() }).strict(),
  z.object({ ...common, intent: z.literal('card-security'), cardName: label, lastFour: lastFour.optional(),
    status: z.enum(['active', 'blocked', 'inactive']), reportedTransaction: transactionSchema.optional(), guidance: description,
    card: paymentCardSchema.optional(),
  }).strict()
    .refine(v => v.card === undefined || v.card.status === v.status, 'El estado de la tarjeta contradice el de la vista.')
    .refine(v => v.card === undefined || v.lastFour === undefined || v.card.lastFour === v.lastFour, 'La terminación no coincide con la tarjeta.'),
  z.object({ ...common, intent: z.literal('savings-goals'), goals: unique(goal, 'id') }).strict(),
  z.object({ ...common, intent: z.literal('banking-information'), bankName: label, holder: label,
    // Only masked identifiers enter the view. No full CLABE, card number, CVV, or document URL.
    maskedClabe: z.string().regex(/^[•*]{14}\d{4}$/).optional(),
    documents: unique(z.object({ id, name: label, period: label, status: z.enum(['available', 'processing']) }).strict(), 'id'),
  }).strict(),
  z.object({ ...common, intent: z.literal('financial-education'), concept: label, explanation: description,
    takeaways: z.array(description).min(1).max(5), scenarios: unique(scenario, 'id', 4).optional(),
  }).strict(),
]);

export const bankingViewSchema = z.union([
  readyBankingViewSchema,
  z.object({ ...common, intent: z.enum(intentIds), state: z.literal('empty'), description }).strict(),
]);
export type BankingViewData = z.infer<typeof bankingViewSchema>;
export type ReadyBankingView = z.infer<typeof readyBankingViewSchema>;
export type TransactionData = z.infer<typeof transactionSchema>;
export type ScenarioData = z.infer<typeof scenario>;
export type PaymentCardData = z.infer<typeof paymentCardSchema>;

export function ownedBalance(accounts: z.infer<typeof accountSchema>[]) {
  // Available credit is a borrowing limit, not the user's money.
  return accounts.filter(a => a.accountType !== 'credit').reduce((sum, a) => sum + a.availableBalance, 0);
}
export type UtilizationLevel = 'healthy' | 'moderate' | 'high' | 'critical';
export function creditUtilization(debt: number, creditLimit: number): { percentage: number; level: UtilizationLevel } {
  const percentage = creditLimit > 0 ? Math.min(100, Math.max(0, debt / creditLimit * 100)) : 0;
  const level: UtilizationLevel = percentage < 30 ? 'healthy' : percentage < 70 ? 'moderate' : percentage < 90 ? 'high' : 'critical';
  return { percentage, level };
}
/** Whole days from today to `day`, both read as Monterrey calendar days. Negative once overdue. */
export function daysUntil(day: string, now: Date = new Date()): number {
  const today = transactionDay(now.toISOString());
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
export function trendDelta(current: number, previous: number): { amount: number; percentage: number | null; direction: 'up' | 'down' | 'flat' } {
  const amount = current - previous;
  return {
    amount,
    percentage: previous === 0 ? null : amount / Math.abs(previous) * 100,
    direction: amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat',
  };
}
export function budgetProgress(spent: number, limit: number) {
  return { percentage: Math.min(100, spent / limit * 100), remaining: limit - spent };
}
export function filterTransactions(rows: TransactionData[], query: string, direction: 'all' | 'expense' | 'income') {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
  return rows.filter(row => {
    const text = `${row.title} ${row.description ?? ''} ${row.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
    return text.includes(normalized) && (direction === 'all' || (direction === 'expense' ? row.amount < 0 : row.amount > 0));
  });
}
