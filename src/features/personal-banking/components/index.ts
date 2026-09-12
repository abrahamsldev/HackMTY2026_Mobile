export {
  AccountBalanceCard,
  type AccountBalanceCardProps,
} from './account-balance-card';
export {
  FinancialStatCard,
  type FinancialStatCardProps,
} from './financial-stat-card';

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
