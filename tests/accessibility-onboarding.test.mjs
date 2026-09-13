import assert from 'node:assert/strict';
import test from 'node:test';
import { initialAccessibilityAnswers, preferencesFromAnswers, preferencesFromMetadata } from '../src/features/accessibility/onboarding.ts';
import { decodeAccessibilityPreferences, defaultAccessibilityPreferences } from '../src/features/accessibility/preferences.ts';
import { registerAccount } from '../src/features/auth/auth-service.ts';

test('registration starts with Banorte and no inferred accessibility needs when answers are private', () => {
  assert.deepEqual(preferencesFromAnswers(initialAccessibilityAnswers), defaultAccessibilityPreferences);
  assert.equal(preferencesFromAnswers({ ...initialAccessibilityAnswers, age: '60plus' }).textScale, 1.25);
  assert.equal(preferencesFromAnswers({ ...initialAccessibilityAnswers, glasses: 'yes' }).textScale, 1.25);
  assert.equal(preferencesFromAnswers({ ...initialAccessibilityAnswers, age: '60plus', glasses: 'yes', reading: 'standard' }).textScale, 1);
});

test('functional needs enable global aids while keeping the initial Banorte palette', () => {
  const result = preferencesFromAnswers({ ...initialAccessibilityAnswers, reading: 'veryLarge', contrast: true, motion: true, targets: true, distinguishColors: true });
  assert.equal(result.textScale, 2);
  for (const field of ['boldText', 'highContrast', 'reduceMotion', 'largeTargets', 'chartDataTable']) assert.equal(result[field], true);
  assert.equal(result.lineSpacing, 1.3);
  assert.equal(result.colorPalette, 'banorte');
});

test('metadata restoration validates preferences and migrates legacy default colors without replacing explicit palettes', () => {
  assert.deepEqual(preferencesFromMetadata({ textScale: 99 }), defaultAccessibilityPreferences);
  assert.deepEqual(preferencesFromMetadata(undefined), defaultAccessibilityPreferences);
  assert.equal(preferencesFromMetadata({ colorPalette: 'default' }).colorPalette, 'banorte');
  assert.equal(decodeAccessibilityPreferences(JSON.stringify({ version: 1, preferences: { colorPalette: 'default', textScale: 1.5 } })).colorPalette, 'banorte');
  assert.equal(preferencesFromMetadata({ colorPalette: 'blue-orange' }).colorPalette, 'blue-orange');
});

test('signup sends only derived settings with the real account and restores them from verified metadata', async () => {
  const settings = preferencesFromAnswers({ ...initialAccessibilityAnswers, glasses: 'yes', motion: true });
  let payload;
  const user = { id: 'new-account', email: 'user@example.com', user_metadata: { accessibility_preferences: settings } };
  const client = { auth: {
    signUp: async (input) => { payload = input; return { data: { session: { user, access_token: 'test-token' } }, error: null }; },
    getUser: async () => ({ data: { user }, error: null }),
  } };
  const session = await registerAccount(client, { email: user.email, password: 'test-password', fullName: 'Persona', accessibilityPreferences: settings });
  assert.deepEqual(payload.options.data, { full_name: 'Persona', accessibility_preferences: settings });
  assert.deepEqual(preferencesFromMetadata(session.user.user_metadata.accessibility_preferences), settings);
  assert.equal('glasses' in payload.options.data, false);
  assert.equal('age' in payload.options.data, false);
});
