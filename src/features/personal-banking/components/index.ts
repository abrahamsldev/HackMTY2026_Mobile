export {
  AccountBalanceCard,
  type AccountBalanceCardProps,
} from './account-balance-card';
export {
  FinancialStatCard,
  type FinancialStatCardProps,
} from './financial-stat-card';
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

export const PERSONAL_BANKING_NAMESPACE = 'personal_banking';

export type PersonalBankingComponentId =
  | 'AccountSelector'
  | 'AccountBalanceCard'
  | 'FinancialStatCard'
  | 'TransactionList'
  | 'TransactionItem'
  | 'CashFlowChart'
  | 'SpendingCategoryChart'
  | 'BudgetProgress'
  | 'BudgetForm'
  | 'ConfirmationCard'
  | 'ActionResult';
