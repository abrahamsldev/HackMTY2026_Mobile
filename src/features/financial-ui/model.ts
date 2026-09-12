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
const common = { title: label, subtitle: description.optional(), currency: z.enum(['MXN', 'USD']).default('MXN') };

export function transactionDay(occurredAt: string): string {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Monterrey' }).formatToParts(new Date(occurredAt));
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export const transactionSchema = z.object({
  transactionId: id, title: label, description: description.optional(), amount: signedMoney,
  occurredAt: z.iso.datetime({ offset: true }),
  category: z.enum(['food', 'transport', 'entertainment', 'utilities', 'health', 'shopping', 'income', 'transfer', 'other']),
  status: z.enum(['pending', 'completed', 'declined']).default('completed'),
}).strict();
const accountSchema = z.object({
  accountId: id, accountName: label, accountType: z.enum(['checking', 'savings', 'credit']),
  accountLastFour: z.string().regex(/^\d{4}$/).optional(), availableBalance: signedMoney,
  status: z.enum(['active', 'blocked', 'inactive']).default('active'),
}).strict();
const scheduleItem = z.object({ id, name: label, date: day, amount: money, direction: z.enum(['income', 'expense']) }).strict();
const scenario = z.object({ id, name: label, monthlyPayment: money, months: z.number().int().min(1).max(600), totalInterest: money }).strict();
const goal = z.object({ id, name: label, saved: money, target: money.positive(), targetDate: day, monthlyContribution: money }).strict();
const unique = <T extends z.ZodType>(schema: T, key: string, max = 30) => z.array(schema).max(max)
  .refine((rows) => new Set(rows.map((row) => (row as Record<string, unknown>)[key])).size === rows.length, 'Identificadores duplicados.');

export const readyBankingViewSchema = z.discriminatedUnion('intent', [
  z.object({ ...common, intent: z.literal('financial-summary'), accounts: unique(accountSchema, 'accountId'), income: money.optional(), expenses: money.optional() }).strict(),
  z.object({ ...common, intent: z.literal('transactions'), startDate: day, endDate: day, timeZone: z.literal('America/Monterrey'), transactions: unique(transactionSchema, 'transactionId', 100) }).strict()
    .refine((v) => v.startDate <= v.endDate, 'Periodo inválido.')
    .refine(v => v.transactions.every(row => {
      if (!Number.isFinite(new Date(row.occurredAt).getTime())) return false;
      const localDay = transactionDay(row.occurredAt);
      return localDay >= v.startDate && localDay <= v.endDate;
    }), 'Hay movimientos fuera del periodo solicitado.'),
  z.object({ ...common, intent: z.literal('spending-analysis'), categories: z.array(z.object({
    category: z.enum(['food', 'transport', 'entertainment', 'utilities', 'health', 'shopping', 'transfer', 'other']), amount: money,
  }).strict()).max(8).refine((v) => new Set(v.map(c => c.category)).size === v.length), previousTotal: money.optional(),
    trend: areaChartPropsSchema.optional(), activity: heatmapChartPropsSchema.refine(v => v.data.length <= 366).optional(),
  }).strict(),
  z.object({ ...common, intent: z.literal('cash-flow'), projectedBalance: signedMoney, targetDate: day, assumptions: description,
    projection: areaChartPropsSchema, upcoming: unique(scheduleItem, 'id'),
  }).strict(),
  z.object({ ...common, intent: z.literal('budgets'), budgets: unique(z.object({
    id, name: label, spent: money, limit: money.positive(), period: label, status: z.enum(['active', 'paused']),
  }).strict(), 'id') }).strict(),
  z.object({ ...common, intent: z.literal('recurring-payments'), payments: unique(z.object({
    id, name: label, amount: money, nextDate: day, cycle: z.enum(['weekly', 'monthly', 'yearly']), status: z.enum(['active', 'paused']),
  }).strict(), 'id') }).strict(),
  z.object({ ...common, intent: z.literal('credit-card'), cardName: label, lastFour: z.string().regex(/^\d{4}$/).optional(),
    debt: money, availableCredit: money, minimumPayment: money, interestFreePayment: money, dueDate: day,
  }).strict(),
  z.object({ ...common, intent: z.literal('debts'), outstanding: money, assumptions: description, scenarios: unique(scenario, 'id', 4).min(1) }).strict(),
  z.object({ ...common, intent: z.literal('transfers'), source: label, recipient: label, amount: money.positive(), fee: money, scheduledDate: day.optional() }).strict(),
  z.object({ ...common, intent: z.literal('card-security'), cardName: label, lastFour: z.string().regex(/^\d{4}$/).optional(),
    status: z.enum(['active', 'blocked', 'inactive']), reportedTransaction: transactionSchema.optional(), guidance: description,
  }).strict(),
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

export function ownedBalance(accounts: z.infer<typeof accountSchema>[]) {
  // Available credit is a borrowing limit, not the user's money.
  return accounts.filter(a => a.accountType !== 'credit').reduce((sum, a) => sum + a.availableBalance, 0);
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
