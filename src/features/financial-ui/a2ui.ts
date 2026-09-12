import { A2UI_BANKING_CATALOG_ID, A2UI_VERSION, type A2UIMessage, type JSONValue } from '../a2ui/types.ts';
import { bankingViewSchema, type BankingViewData } from './model.ts';

export function bankingViewMessages(input: BankingViewData): A2UIMessage[] {
  const view = bankingViewSchema.parse(input);
  const surfaceId = `banking-${view.intent}`;
  return [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: A2UI_BANKING_CATALOG_ID } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: [
      { id: 'root', component: 'BankingView', view: { path: '/view' } },
    ] } },
    { version: A2UI_VERSION, updateDataModel: { surfaceId, path: '/', value: { view: JSON.parse(JSON.stringify(view)) as JSONValue } } },
  ];
}
