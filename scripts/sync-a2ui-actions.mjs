// MCP owns the declarative contract. Generate Expo/agent copies and static A2UI templates.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mcp = path.join(root, 'hackmty2026-mcp/src/supabase_mcp');
const check = process.argv.includes('--check');
function emit(target, value) {
  const encoded = JSON.stringify(value, null, 2) + '\n';
  if (check) {
    if (readFileSync(target, 'utf8') !== encoded) throw new Error(`Contrato desincronizado: ${target}`);
  } else writeFileSync(target, encoded);
}
const read = name => JSON.parse(readFileSync(path.join(mcp, 'a2ui_actions', `${name}.json`), 'utf8'));
const inputs = read('inputs');
const registry = read('actions');
for (const relative of ['src/features/a2ui/a2ui_actions', 'hackmty2026-agent/src/fluidbank_orchestrator/a2ui_actions']) {
  emit(path.join(root, relative, 'inputs.json'), inputs);
  emit(path.join(root, relative, 'actions.json'), registry);
}
for (const action of registry.actions) {
  if (action.inputCount !== action.inputs.length) throw new Error(`Cantidad incorrecta: ${action.name}`);
  const previewId = action.preview ? 'preview' : null;
  const components = [
    { id: 'root', component: 'Column', children: ['title', ...(previewId ? [previewId] : []), 'help', ...action.inputs.map(field => field.key), 'submit'] },
    { id: 'title', component: 'Text', text: action.title, variant: 'h2' },
    { id: 'help', component: 'Text', text: { path: '/help' } },
  ];
  if (action.preview) {
    components.push({ id: previewId, component: action.preview.component, view: { path: action.preview.path } });
  }
  for (const field of action.inputs) {
    const input = inputs.inputs.find(item => item.type === field.input);
    if (!input || input.role === 'submit') throw new Error('Tipo de input desconocido');
    const component = { id: field.key, component: input.component, label: field.label, value: { path: `/form/${field.key}` } };
    if (field.input === 'date') Object.assign(component, { enableDate: true, enableTime: false });
    if (field.input === 'slider') Object.assign(component, { min: field.min, max: field.max });
    components.push(component);
  }
  components.push(
    { id: 'submit', component: 'Button', child: 'submit-label', variant: 'primary', action: { event: { name: action.name, context: Object.fromEntries(action.contextFields.map(key => [key, { path: `/form/${key}` }])) } } },
    { id: 'submit-label', component: 'Text', text: action.submitLabel },
  );
  emit(path.join(mcp, 'a2ui_support/templates', `${action.surfaceId}.json`), [
    { version: inputs.version, createSurface: { surfaceId: action.surfaceId, catalogId: action.catalogId ?? inputs.catalogId } },
    { version: inputs.version, updateComponents: { surfaceId: action.surfaceId, components } },
  ]);
}
console.log(check ? 'Contratos y plantillas sincronizados.' : 'Contratos y plantillas generados.');
