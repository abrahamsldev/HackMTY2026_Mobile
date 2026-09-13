import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { defaultAccessibilityPreferences, decodeAccessibilityPreferences } from '../src/features/accessibility/preferences.ts';
import { registerAccount } from '../src/features/auth/auth-service.ts';

// Accessibility preferences are per profile *on this device*: AsyncStorage only,
// never Supabase user metadata, never the agent or MCP. The signup payload is
// where that would leak first, so it is asserted rather than assumed.
test('signup sends only the account name, never accessibility preferences', async () => {
  let payload;
  const user = { id: 'new-account', email: 'user@example.com', user_metadata: { full_name: 'Persona' } };
  const client = { auth: {
    signUp: async (input) => { payload = input; return { data: { session: { user, access_token: 'test-token' } }, error: null }; },
    getUser: async () => ({ data: { user }, error: null }),
  } };
  const session = await registerAccount(client, { email: user.email, password: 'test-password', fullName: 'Persona' });
  assert.deepEqual(payload.options.data, { full_name: 'Persona' });
  assert.equal(session.user.id, 'new-account');
});

// 'default' ("Estándar") is a palette the user can still pick in Settings, and
// charts render it differently. Reading preferences back must return the chosen
// palette unchanged instead of silently upgrading it to Banorte.
test('stored preferences round-trip every selectable palette without rewriting it', () => {
  assert.equal(defaultAccessibilityPreferences.colorPalette, 'banorte');
  for (const colorPalette of ['default', 'blue-orange', 'monochrome', 'banorte']) {
    const raw = JSON.stringify({ version: 1, preferences: { ...defaultAccessibilityPreferences, colorPalette } });
    assert.equal(decodeAccessibilityPreferences(raw).colorPalette, colorPalette);
  }
});

// The onboarding questionnaire (`onboarding.ts`, `registration-questions.tsx`)
// was superseded by the full accessibility panel on the sign-in screen; nothing
// may reintroduce an unreachable second way to derive these preferences.
test('no unreachable second source of accessibility preferences exists', () => {
  const signIn = readFileSync(new URL('../src/app/sign-in.tsx', import.meta.url), 'utf8');
  assert.match(signIn, /AccessibilitySettings/u);
  assert.doesNotMatch(signIn, /RegistrationQuestions|preferencesFrom/u);
});
