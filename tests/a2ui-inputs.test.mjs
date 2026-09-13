import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { A2UIMessageProcessor } from '../src/features/a2ui/message-processor.ts';
import { InputModel, validDate } from '../src/features/a2ui/a2ui_actions/model.ts';
import { parseAgentReply } from '../src/features/assistant/agent.ts';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const registry = read('../src/features/a2ui/a2ui_actions/actions.json');
const templates = '../hackmty2026-mcp/src/supabase_mcp/a2ui_support/templates/';
const data = { name: 'Vacaciones', category: 'groceries', limit_amount: 3000, start_date: '2026-09-13', end_date: '2026-10-13', target_amount: 18000, target_date: '2027-01-01', suggested_monthly_contribution: 1500, id: 'f52827d7-0213-4df4-9621-14775d6228d4' };

test('Expo, MCP and agent ship identical input/action registries and every form is renderable', () => {
  for (const file of ['inputs', 'actions']) {
    const expected = read(`../src/features/a2ui/a2ui_actions/${file}.json`);
    assert.deepEqual(read(`../hackmty2026-mcp/src/supabase_mcp/a2ui_actions/${file}.json`), expected);
    assert.deepEqual(read(`../hackmty2026-agent/src/fluidbank_orchestrator/a2ui_actions/${file}.json`), expected);
  }
  for (const action of registry.actions) {
    assert.equal(action.inputCount, action.inputs.length);
    const result = new A2UIMessageProcessor().process([...read(`${templates}${action.surfaceId}.json`), { version: 'v0.9.1', updateDataModel: { surfaceId: action.surfaceId, value: { form: data, help: 'Revisa los datos' } } }]);
    assert.equal(result.ok, true, action.name);
    const model = new InputModel(result.surfaces[0]);
    const event = model.action(model.surface.components.get('submit'));
    assert.equal(event.name, action.name);
    assert.deepEqual(Object.keys(event.context).sort(), action.contextFields.toSorted());
  }
});

test('a keystroke immediately followed by submit uses current values and retry reuses the event', () => {
  const result = new A2UIMessageProcessor().process([...read(`${templates}budget-create.json`), { version: 'v0.9.1', updateDataModel: { surfaceId: 'budget-create', value: { form: data, help: 'Revisa' } } }]);
  const original = result.surfaces[0];
  const model = new InputModel(original);
  const input = original.components.get('name');
  const button = original.components.get('submit');
  // Parent renders may return a newly cloned but equivalent server surface.
  // It must not replace the local draft after every keystroke.
  for (const value of ['N', 'No', 'Nom', 'Nomb', 'Nombre recién escrito']) {
    model.write(input, value);
    model.receive({
      ...original,
      components: new Map(original.components),
      dataModel: structuredClone(original.dataModel),
    });
  }
  const first = model.action(button);
  assert.equal(first.context.name, 'Nombre recién escrito');
  assert.equal(original.dataModel.form.name, 'Vacaciones');
  assert.strictEqual(model.action(button), first);
  model.write(input, 'Otro nombre');
  assert.notStrictEqual(model.action(button), first);
  assert.throws(() => model.write(original.components.get('limit_amount'), 100001));
  model.write(original.components.get('end_date'), '2026-02-30');
  assert.throws(() => model.action(button), /fecha válida/);
});

test('an actual server data update replaces the local input draft', () => {
  const result = new A2UIMessageProcessor().process([
    ...read(`${templates}budget-create.json`),
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'budget-create',
        value: { form: data, help: 'Revisa' },
      },
    },
  ]);
  const original = result.surfaces[0];
  const model = new InputModel(original);
  const input = original.components.get('name');

  model.write(input, 'Borrador local');
  model.receive({
    ...original,
    components: new Map(original.components),
    dataModel: {
      ...structuredClone(original.dataModel),
      form: { ...structuredClone(original.dataModel.form), name: 'Valor del agente' },
    },
  });

  assert.equal(model.action(original.components.get('submit')).context.name, 'Valor del agente');
});

test('dates reject impossible days and action outcomes never infer success from HTTP 200', () => {
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
  assert.equal(validDate('2026-13-01'), false);
  const failure = { status: 'failure', message: 'El servicio no tiene habilitado el guardado.', code: 'writes_not_configured' };
  assert.deepEqual(parseAgentReply({ message: failure.message, data: { actionResult: failure }, a2ui: null }).actionResult, failure);
  assert.equal(parseAgentReply({ message: 'OK', data: {}, a2ui: null }).actionResult, undefined);
});
