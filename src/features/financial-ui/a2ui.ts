import { A2UI_BANKING_CATALOG_ID, A2UI_VERSION, type A2UIMessage, type JSONValue } from '../a2ui/types.ts';
import { bankingViewSchema, type BankingViewData } from './model.ts';

const FINANCIAL_VIEW_SURFACE_ID = 'financial-view';
const FINANCIAL_VIEW_ACTION = 'request_financial_view';
const FINANCIAL_VIEW_ACTION_COMPONENT_ID = 'request_financial_view_button';

function followUp(intent: BankingViewData['intent']) {
  return intent === 'financial-summary'
    ? { actionLabel: 'Ver gastos del último mes', requestIntent: 'transactions' as const }
    : { actionLabel: 'Volver al panorama financiero', requestIntent: 'financial-summary' as const };
}

export function bankingViewMessages(input: BankingViewData): A2UIMessage[] {
  const view = bankingViewSchema.parse(input);
  const { actionLabel, requestIntent } = followUp(view.intent);
  const components: A2UIMessage = {
    version: A2UI_VERSION,
    updateComponents: {
      surfaceId: FINANCIAL_VIEW_SURFACE_ID,
      components: [
        {
          id: 'root',
          component: 'Column',
          children: ['banking_view', FINANCIAL_VIEW_ACTION_COMPONENT_ID],
        },
        { id: 'banking_view', component: 'BankingView', view: { path: '/view' } },
        {
          id: 'request_financial_view_label',
          component: 'Text',
          text: { path: '/actionLabel' },
        },
        {
          id: FINANCIAL_VIEW_ACTION_COMPONENT_ID,
          component: 'Button',
          child: 'request_financial_view_label',
          variant: 'primary',
          action: {
            event: {
              name: FINANCIAL_VIEW_ACTION,
              context: { intent: { path: '/requestIntent' } },
            },
          },
        },
      ],
    },
  };
  return [
    {
      version: A2UI_VERSION,
      createSurface: {
        surfaceId: FINANCIAL_VIEW_SURFACE_ID,
        catalogId: A2UI_BANKING_CATALOG_ID,
      },
    },
    components,
    {
      version: A2UI_VERSION,
      updateDataModel: {
        surfaceId: FINANCIAL_VIEW_SURFACE_ID,
        path: '/',
        value: {
          view: JSON.parse(JSON.stringify(view)) as JSONValue,
          actionLabel,
          requestIntent,
        },
      },
    },
  ];
}
