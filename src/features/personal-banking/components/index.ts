export {
  AccountBalanceCard,
  type AccountBalanceCardProps,
} from './account-balance-card';
export {
  FinancialStatCard,
  type FinancialStatCardProps,
} from './financial-stat-card';
export {
  CreditUtilizationGauge,
  type CreditUtilizationGaugeProps,
} from './credit-utilization-gauge';
export {
  DueDateCountdown,
  type DueDateCountdownProps,
} from './due-date-countdown';
export {
  PaymentCard,
  type PaymentCardProps,
} from './payment-card';
export {
  SpendingCategoryChart,
  type SpendingCategory,
  type SpendingCategoryChartProps,
} from './spending-category-chart';
export {
  TransactionItem,
  type TransactionItemProps,
} from './transaction-item';
export {
  TransactionList,
  type TransactionListProps,
} from './transaction-list';
export {
  TrendIndicator,
  type TrendIndicatorProps,
} from './trend-indicator';

export const PERSONAL_BANKING_NAMESPACE = 'personal_banking';

export type PersonalBankingComponentId =
  | 'AccountSelector'
  | 'AccountBalanceCard'
  | 'PaymentCard'
  | 'CreditUtilizationGauge'
  | 'DueDateCountdown'
  | 'TrendIndicator'
  | 'FinancialStatCard'
  | 'TransactionList'
  | 'TransactionItem'
  | 'CashFlowChart'
  | 'SpendingCategoryChart'
  | 'BudgetProgress'
  | 'BudgetForm'
  | 'ConfirmationCard'
  | 'ActionResult';
