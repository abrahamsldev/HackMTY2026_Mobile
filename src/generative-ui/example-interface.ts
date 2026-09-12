import type { GenerativeNode } from './types';

/**
 * Example generative interface description conforming strictly to A2UI / Generative Schema.
 *
 * Structure:
 * Page
 * └── Stack
 *     ├── Section
 *     │   └── Grid
 *     │       ├── AccountBalanceCard (Saldo disponible con onPress a MCP)
 *     │       ├── FinancialStatCard (Ingresos del mes)
 *     │       └── FinancialStatCard (Gastos del mes con valor negativo)
 *     ├── Section
 *     │   └── SpendingCategoryChart (Gastos por categoría interactivo con payload dinámico)
 *     ├── Section
 *     │   └── TransactionList
 *     │       ├── TransactionItem (Supermercado: negativo, categoría food)
 *     │       ├── TransactionItem (Transporte: negativo)
 *     │       ├── TransactionItem (Streaming: negativo)
 *     │       └── TransactionItem (Depósito nómina: positivo)
 *     └── Section
 *         └── Card (Flujo de efectivo / Proyección con TextBlock)
 */
export const exampleFinancialInterface: GenerativeNode = {
  id: 'financial-dashboard-page',
  type: 'Page',
  props: {
    scrollable: true,
    safeArea: true,
    padding: 'md',
    background: 'default',
  },
  children: [
    {
      id: 'main-stack',
      type: 'Stack',
      props: {
        direction: 'column',
        spacing: 'lg',
        align: 'stretch',
        justify: 'start',
      },
      children: [
        // Section 1: Financial Summary Cards in a responsive Grid
        {
          id: 'summary-section',
          type: 'Section',
          props: {
            spacing: 'md',
            padding: 'none',
          },
          children: [
            {
              id: 'header-stack',
              type: 'Stack',
              props: {
                direction: 'column',
                spacing: 'none',
              },
              children: [
                {
                  id: 'dashboard-title',
                  type: 'TextBlock',
                  props: {
                    value: 'Resumen Financiero',
                    variant: 'title',
                    color: 'default',
                    align: 'left',
                  },
                },
                {
                  id: 'dashboard-subtitle',
                  type: 'TextBlock',
                  props: {
                    value: 'Generado en tiempo real por el agente Banorte',
                    variant: 'caption',
                    color: 'muted',
                    align: 'left',
                  },
                },
              ],
            },
            {
              id: 'kpi-grid',
              type: 'Grid',
              props: {
                columns: 3,
                mobileColumns: 1,
                spacing: 'md',
              },
              children: [
                // Card 1: AccountBalanceCard especializado
                {
                  id: 'main-account',
                  type: 'AccountBalanceCard',
                  props: {
                    accountId: 'account-001',
                    accountName: 'Cuenta Enlace Personal',
                    accountType: 'checking',
                    accountLastFour: '4821',
                    availableBalance: 128450,
                    currency: 'MXN',
                    status: 'active',
                    variant: 'highlighted',
                  },
                  actions: {
                    onPress: {
                      event: 'view_account_details',
                      tool: 'banorte_get_account_details',
                      payload: {
                        accountId: 'account-001',
                      },
                    },
                  },
                },
                // Card 2: FinancialStatCard especializado para ingresos
                {
                  id: 'monthly-income',
                  type: 'FinancialStatCard',
                  props: {
                    label: 'Ingresos del mes',
                    value: 42800,
                    format: 'currency',
                    currency: 'MXN',
                    tone: 'positive',
                    comparison: {
                      value: 8.4,
                      label: 'contra el mes anterior',
                    },
                  },
                },
                // Card 3: FinancialStatCard especializado para gastos con valor negativo
                {
                  id: 'monthly-expenses',
                  type: 'FinancialStatCard',
                  props: {
                    label: 'Gastos del mes',
                    value: -18320.5,
                    format: 'currency',
                    currency: 'MXN',
                    tone: 'negative',
                    comparison: {
                      value: -3.2,
                      label: 'contra el mes anterior',
                    },
                  },
                },
              ],
            },
          ],
        },

        // Section 2: SpendingCategoryChart (Gráfica de gastos por categoría)
        {
          id: 'spending-chart-section',
          type: 'Section',
          props: {
            spacing: 'sm',
            padding: 'none',
          },
          children: [
            {
              id: 'monthly-spending-chart',
              type: 'SpendingCategoryChart',
              props: {
                title: 'Gastos por categoría',
                subtitle: 'Septiembre de 2026',
                currency: 'MXN',
                showPercentages: true,
                maxCategories: 6,
                categories: [
                  {
                    category: 'food',
                    amount: 4850.75,
                  },
                  {
                    category: 'transport',
                    amount: 2730,
                  },
                  {
                    category: 'entertainment',
                    amount: 1680,
                  },
                  {
                    category: 'utilities',
                    amount: 3200,
                  },
                  {
                    category: 'shopping',
                    amount: 1860,
                  },
                ],
              },
              actions: {
                onCategoryPress: {
                  event: 'spending_category_selected',
                  tool: 'banorte_get_transactions_by_category',
                  payload: {
                    accountId: 'account-001',
                    period: '2026-09',
                  },
                },
              },
            },
          ],
        },

        // Section 3: Movimientos Recientes (TransactionList con 4 TransactionItems)
        {
          id: 'transactions-section',
          type: 'Section',
          props: {
            spacing: 'sm',
            padding: 'none',
          },
          children: [
            {
              id: 'recent-transactions-list',
              type: 'TransactionList',
              props: {
                title: 'Movimientos Recientes',
                emptyMessage: 'No hay movimientos recientes registrados.',
              },
              children: [
                // 1. Supermercado (gasto negativo, categoría food corregida)
                {
                  id: 'txn-supermarket',
                  type: 'TransactionItem',
                  props: {
                    transactionId: 'txn-001',
                    title: 'HEB San Pedro',
                    description: 'Supermercado y despensa semanal',
                    amount: -1450.8,
                    currency: 'MXN',
                    occurredAt: '2026-09-11T14:30:00.000Z',
                    category: 'food',
                    status: 'completed',
                  },
                  actions: {
                    onPress: {
                      event: 'view_transaction_details',
                      tool: 'banorte_get_transaction_details',
                      payload: {
                        transactionId: 'txn-001',
                      },
                    },
                  },
                },
                // 2. Transporte o gasolina (gasto negativo)
                {
                  id: 'txn-transport',
                  type: 'TransactionItem',
                  props: {
                    transactionId: 'txn-002',
                    title: 'OXXO GAS Lázaro Cárdenas',
                    description: 'Combustible Magna 35 litros',
                    amount: -780.0,
                    currency: 'MXN',
                    occurredAt: '2026-09-10T19:15:00.000Z',
                    category: 'transport',
                    status: 'completed',
                  },
                  actions: {
                    onPress: {
                      event: 'view_transaction_details',
                      tool: 'banorte_get_transaction_details',
                      payload: {
                        transactionId: 'txn-002',
                      },
                    },
                  },
                },
                // 3. Servicio de streaming (gasto negativo)
                {
                  id: 'txn-streaming',
                  type: 'TransactionItem',
                  props: {
                    transactionId: 'txn-003',
                    title: 'Netflix México',
                    description: 'Plan mensual estándar HD',
                    amount: -219.0,
                    currency: 'MXN',
                    occurredAt: '2026-09-09T08:00:00.000Z',
                    category: 'entertainment',
                    status: 'completed',
                  },
                  actions: {
                    onPress: {
                      event: 'view_transaction_details',
                      tool: 'banorte_get_transaction_details',
                      payload: {
                        transactionId: 'txn-003',
                      },
                    },
                  },
                },
                // 4. Depósito de nómina (ingreso positivo)
                {
                  id: 'txn-payroll',
                  type: 'TransactionItem',
                  props: {
                    transactionId: 'txn-004',
                    title: 'Nómina Quincenal Banorte',
                    description: 'Transferencia electrónica SPEI',
                    amount: 21400.0,
                    currency: 'MXN',
                    occurredAt: '2026-09-08T09:00:00.000Z',
                    category: 'income',
                    status: 'completed',
                  },
                  actions: {
                    onPress: {
                      event: 'view_transaction_details',
                      tool: 'banorte_get_transaction_details',
                      payload: {
                        transactionId: 'txn-004',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },

        // Section 4: Proyección y Flujo de Efectivo
        {
          id: 'cashflow-section',
          type: 'Section',
          props: {
            spacing: 'sm',
            padding: 'none',
          },
          children: [
            {
              id: 'card-cashflow',
              type: 'Card',
              props: {
                variant: 'elevated',
                padding: 'lg',
              },
              actions: {
                onPress: {
                  event: 'open_cashflow_details',
                  tool: 'banorte_simulate_cashflow',
                  payload: { forecastDays: 30 },
                },
              },
              children: [
                {
                  id: 'cashflow-title',
                  type: 'TextBlock',
                  props: {
                    value: 'Proyección de Flujo de Efectivo',
                    variant: 'subtitle',
                    color: 'default',
                  },
                },
                {
                  id: 'cashflow-description',
                  type: 'TextBlock',
                  props: {
                    value:
                      'Basado en tus patrones de gasto habituales y pagos programados, se proyecta un superávit de $24,479.50 MXN al corte del 30 de septiembre.',
                    variant: 'body',
                    color: 'muted',
                  },
                },
                {
                  id: 'cashflow-cta',
                  type: 'TextBlock',
                  props: {
                    value: 'Toca para simular escenarios de ahorro o inversión con IA →',
                    variant: 'caption',
                    color: 'default',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
