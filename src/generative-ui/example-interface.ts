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
 *     │       └── FinancialStatCard (Gastos del mes)
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
                // Card 3: FinancialStatCard especializado para gastos
                {
                  id: 'monthly-expenses',
                  type: 'FinancialStatCard',
                  props: {
                    label: 'Gastos del mes',
                    value: 18320.5,
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
