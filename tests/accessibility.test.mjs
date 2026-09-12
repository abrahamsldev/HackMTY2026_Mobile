import assert from 'node:assert/strict';
import test from 'node:test';
import { accessibilityPreferencesSchema, accessibilityStorageKey, createPreferenceWriter, decodeAccessibilityPreferences, defaultAccessibilityPreferences as defaults, encodeAccessibilityPreferences, resolveAccessibility } from '../src/features/accessibility/preferences.ts';
import { accessibleColors } from '../src/features/accessibility/theme.ts';

const system = { reduceMotion: false, boldText: false, screenReader: false };

test('preferences have safe defaults and reject unsafe, unsupported or corrupt stored values', () => {
  assert.equal(defaults.colorPalette, 'banorte');
  assert.deepEqual(decodeAccessibilityPreferences(null), defaults);
  assert.deepEqual(decodeAccessibilityPreferences('{"version":1,"preferences":{}}'), defaults);
  for (const patch of [{ textScale: 0 }, { textScale: 99 }, { lineSpacing: -1 }, { colorPalette: 'custom' }, { extra: true }]) {
    assert.equal(accessibilityPreferencesSchema.safeParse({ ...defaults, ...patch }).success, false);
  }
  for (const raw of ['{', '{"version":2,"preferences":{}}', '{"version":1,"preferences":{"boldText":"yes"}}']) assert.throws(() => decodeAccessibilityPreferences(raw));
});

test('user choices cannot disable system reduced motion, bold text or accessible chart alternatives', () => {
  const effective = resolveAccessibility(defaults, { reduceMotion: true, boldText: true, screenReader: true });
  assert.equal(effective.reduceMotion, true); assert.equal(effective.boldText, true); assert.equal(effective.showChartData, true);
  assert.equal(resolveAccessibility(defaults, { ...system, fontScale: 2 }).showChartData, true);
  assert.equal(resolveAccessibility({ ...defaults, textScale: 1.5 }, system).showChartData, true);
  assert.equal(resolveAccessibility({ ...defaults, largeTargets: true }, system).minTargetSize, 64);
  assert.equal(resolveAccessibility(defaults, system).minTargetSize, 48);
});

test('storage isolates guest and accounts; preferences round-trip independently', async () => {
  const storage = new Map();
  const adapter = { setItem: async (key, value) => { storage.set(key, value); } };
  const guest = createPreferenceWriter(adapter, accessibilityStorageKey(null));
  const account = createPreferenceWriter(adapter, accessibilityStorageKey('alice'));
  await guest({ ...defaults, textScale: 2 });
  await account({ ...defaults, highContrast: true, colorPalette: 'banorte' });
  assert.equal(decodeAccessibilityPreferences(storage.get(accessibilityStorageKey(null))).textScale, 2);
  assert.equal(decodeAccessibilityPreferences(storage.get(accessibilityStorageKey('alice'))).highContrast, true);
  assert.equal(decodeAccessibilityPreferences(storage.get(accessibilityStorageKey('alice'))).colorPalette, 'banorte');
  assert.equal(decodeAccessibilityPreferences(storage.get(accessibilityStorageKey('bob')) ?? null).highContrast, false);
  assert.notEqual(accessibilityStorageKey('guest'), accessibilityStorageKey(null));
});

test('rapid preference writes are ordered and a failed save does not block retry or reset', async () => {
  let release;
  let stored;
  let calls = 0;
  const writer = createPreferenceWriter({ setItem: async (_, value) => {
    calls += 1;
    if (calls === 1) await new Promise((resolve) => { release = resolve; });
    if (calls === 2) throw new Error('disk failure');
    stored = value;
  } }, 'test');
  const first = writer({ ...defaults, textScale: 2 });
  await Promise.resolve(); await Promise.resolve();
  const failed = writer({ ...defaults, highContrast: true });
  const rejection = assert.rejects(failed, /disk failure/);
  const latest = writer({ ...defaults, colorPalette: 'blue-orange' });
  assert.equal(calls, 1);
  release();
  await Promise.all([first, rejection, latest]);
  assert.equal(decodeAccessibilityPreferences(stored).colorPalette, 'blue-orange');
  await writer(defaults);
  assert.equal(stored, encodeAccessibilityPreferences(defaults));
});

function contrast(a, b) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test('text and button tokens remain readable across all themes and palettes', () => {
  for (const mode of ['light', 'dark']) {
    const base = mode === 'light'
      ? { text: '#000000', background: '#FFFFFF', backgroundElement: '#F0F0F3', backgroundSelected: '#E0E1E6', textSecondary: '#60646C' }
      : { text: '#FFFFFF', background: '#000000', backgroundElement: '#212225', backgroundSelected: '#2E3135', textSecondary: '#B0B4BA' };
    for (const colorPalette of ['default', 'blue-orange', 'monochrome', 'banorte']) for (const highContrast of [false, true]) {
      const colors = accessibleColors(base, mode, { ...defaults, colorPalette, highContrast });
      for (const token of ['text', 'textSecondary', 'info', 'success', 'danger', 'warning']) for (const surface of ['background', 'backgroundElement', 'backgroundSelected']) {
        assert.ok(contrast(colors[token], colors[surface]) >= (highContrast ? 7 : 4.5), `${mode}/${colorPalette}/${token}/${surface}`);
      }
      assert.ok(contrast(colors.onAccent, colors.accent) >= (highContrast ? 7 : 4.5));
      assert.ok(contrast('#FFFFFF', colors.dangerBackground) >= 4.5);
    }
  }
});
