// Offline export. This script never contacts the agent, MCP or Supabase.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { bankingViewSchema } from '../src/features/financial-ui/model.ts';
import { bankingViewMessages } from '../src/features/financial-ui/a2ui.ts';
import { financialViewCatalog } from '../src/features/financial-ui/catalog.ts';
import { A2UI_BANKING_CATALOG_ID } from '../src/features/a2ui/types.ts';

const target = new URL('../docs/a2ui/', import.meta.url);
mkdirSync(target, { recursive: true });
const write = (name, value) => writeFileSync(new URL(name, target), `${JSON.stringify(value, null, 2)}\n`);
const examples = JSON.parse(readFileSync(new URL('../src/features/financial-ui/examples.json', import.meta.url), 'utf8'));
write('banking-view.schema.json', { $id: `${A2UI_BANKING_CATALOG_ID}/banking-view.schema.json`, ...z.toJSONSchema(bankingViewSchema, { io: 'input' }) });
write('banking-view.examples.json', examples.map(input => {
  const data = bankingViewSchema.parse(input);
  return { intent: data.intent, message: 'Vista de ejemplo; los datos son ficticios.', data: {}, a2ui: { resource_uri: `a2ui://banking/${data.intent}`, messages: bankingViewMessages(data) } };
}));
write('banking-view.catalog.json', { catalogId: A2UI_BANKING_CATALOG_ID, component: 'BankingView', prop: 'view', intents: financialViewCatalog });
console.log(`Exported schema, mapping and ${examples.length} A2UI example responses.`);
