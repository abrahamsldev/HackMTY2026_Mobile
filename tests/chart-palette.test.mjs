import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultAccessibilityPreferences as defaults } from '../src/features/accessibility/preferences.ts';
import { accessibleColors } from '../src/features/accessibility/theme.ts';
import { validate, validateOrdinal } from '../scripts/validate-chart-palette.mjs';

// The real chart surfaces: `Colors.light.background` and `Colors.dark.background`
// from `constants/theme.ts` (that module pulls in react-native, so the values are
// mirrored here rather than imported).
const surfaces = { light: '#FFFFFF', dark: '#171719' };
const base = {
  light: { text: '#000000', background: '#FFFFFF', backgroundElement: '#F0F0F3', backgroundSelected: '#E0E1E6', textSecondary: '#60646C' },
  dark: { text: '#FFFFFF', background: '#171719', backgroundElement: '#242428', backgroundSelected: '#323238', textSecondary: '#B9BAC2' },
};

const failing = (report) => report.filter(([, state]) => state === 'fail' || state === false).map(([name, , detail]) => `${name}: ${detail}`);
const warning = (report) => report.filter(([, state]) => state === 'floor' || state === 'relief').map(([name, , detail]) => `${name}: ${detail}`);

for (const mode of ['light', 'dark']) {
  for (const colorPalette of ['default', 'blue-orange', 'banorte']) {
    test(`chart palette "${colorPalette}" passes every categorical check on the ${mode} surface`, () => {
      const { chartColors } = accessibleColors(base[mode], mode, { ...defaults, colorPalette, highContrast: false });
      const result = validate(chartColors, { mode, surface: surfaces[mode] });
      assert.deepEqual(failing(result.report), [], `${colorPalette}/${mode}`);
      assert.ok(result.ok, `${colorPalette}/${mode}`);
      // Nothing in these sets relies on a WARN-band relief (direct labels,
      // texture, table view) to be legal. Keep it that way: `default` is the
      // one palette the area chart draws with color alone, and a contrast
      // relief on a 2.5px line is not something a reader can lean on.
      assert.deepEqual(warning(result.report), [], `${colorPalette}/${mode}`);
    });
  }

  test(`chart palette "monochrome" is a valid single-hue ordinal ramp on the ${mode} surface`, () => {
    const { chartColors } = accessibleColors(base[mode], mode, { ...defaults, colorPalette: 'monochrome', highContrast: false });
    // The ramp is stored dark→light on the light surface and light→dark on the
    // dark one; the validator wants light→dark, so sort by luminance first.
    const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, v) => a + v, 0);
    const ordered = [...chartColors].sort((a, b) => lum(b) - lum(a));
    const result = validateOrdinal(ordered, { mode, surface: surfaces[mode] });
    assert.deepEqual(failing(result.report), [], `monochrome/${mode}`);
    assert.ok(result.ok, `monochrome/${mode}`);
  });
}

test('every palette keeps exactly four fixed slots so a series never changes hue with the series count', () => {
  for (const mode of ['light', 'dark']) for (const colorPalette of ['default', 'blue-orange', 'monochrome', 'banorte']) {
    const { chartColors } = accessibleColors(base[mode], mode, { ...defaults, colorPalette });
    assert.equal(chartColors.length, 4, `${colorPalette}/${mode}`);
    assert.equal(new Set(chartColors).size, 4, `${colorPalette}/${mode} has a repeated slot`);
  }
});
