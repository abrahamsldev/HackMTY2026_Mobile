import type { GenerativeNode } from './types';

/**
 * Example generative interface description conforming strictly to A2UI / Generative Schema.
 * Structure:
 * Page
 * └── Stack
 *     ├── Section
 *     │   └── Grid
 *     │       ├── Card (Saldo disponible)
 *     │       ├── Card (Ingresos)
 *     │       └── Card (Gastos)
 *     └── Section
 *         └── Card (Flujo de efectivo / Proyección)
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
                // Card 1: Saldo Disponible
                {
                  id: 'card-balance',
                  type: 'Card',
                  props: {
                    variant: 'highlighted',
                    padding: 'md',
                  },
                  actions: {
                    onPress: {
                      event: 'view_account_details',
                      tool: 'banorte_get_account_details',
                      payload: { accountId: 'perfiles-banorte-001' },
                    },
                  },
                  children: [
                    {
                      id: 'card-balance-label',
                      type: 'TextBlock',
                      props: {
                        value: 'Saldo Disponible',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                    {
                      id: 'card-balance-amount',
                      type: 'TextBlock',
                      props: {
                        value: '$128,450.00 MXN',
                        variant: 'amount',
                        color: 'default',
                      },
                    },
                    {
                      id: 'card-balance-sub',
                      type: 'TextBlock',
                      props: {
                        value: 'Cuenta Débito Preferente •••• 4921',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                  ],
                },
                // Card 2: Ingresos del mes
                {
                  id: 'card-income',
                  type: 'Card',
                  props: {
                    variant: 'outlined',
                    padding: 'md',
                  },
                  actions: {
                    onPress: {
                      event: 'view_income_breakdown',
                      tool: 'banorte_get_income_metrics',
                      payload: { period: 'current_month' },
                    },
                  },
                  children: [
                    {
                      id: 'card-income-label',
                      type: 'TextBlock',
                      props: {
                        value: 'Ingresos del Mes',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                    {
                      id: 'card-income-amount',
                      type: 'TextBlock',
                      props: {
                        value: '+$42,800.00 MXN',
                        variant: 'amount',
                        color: 'success',
                      },
                    },
                    {
                      id: 'card-income-sub',
                      type: 'TextBlock',
                      props: {
                        value: '+12.5% vs. mes anterior',
                        variant: 'caption',
                        color: 'success',
                      },
                    },
                  ],
                },
                // Card 3: Gastos del mes
                {
                  id: 'card-expenses',
                  type: 'Card',
                  props: {
                    variant: 'outlined',
                    padding: 'md',
                  },
                  actions: {
                    onPress: {
                      event: 'view_expenses_breakdown',
                      tool: 'banorte_get_spending_categories',
                      payload: { period: 'current_month' },
                    },
                  },
                  children: [
                    {
                      id: 'card-expenses-label',
                      type: 'TextBlock',
                      props: {
                        value: 'Gastos del Mes',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                    {
                      id: 'card-expenses-amount',
                      type: 'TextBlock',
                      props: {
                        value: '-$18,320.50 MXN',
                        variant: 'amount',
                        color: 'danger',
                      },
                    },
                    {
                      id: 'card-expenses-sub',
                      type: 'TextBlock',
                      props: {
                        value: '42% del presupuesto utilizado',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Section 2: Proyección y Flujo de Efectivo
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
