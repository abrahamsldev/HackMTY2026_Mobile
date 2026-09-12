import assert from 'node:assert/strict';
import test from 'node:test';
import { isRealUser, verifySession, signInWithAccount, registerAccount, authErrorMessage } from '../src/features/auth/auth-service.ts';

const user = { id: '5b9d23ca-ae95-49cc-9f71-ef62e6aaccb9', email: 'person@example.com', email_confirmed_at: '2026-09-12T12:00:00Z', is_anonymous: false };
const session = { user, access_token: 'valid-test-token' };

test('only confirmed non-anonymous accounts qualify for protected routes', () => {
  assert.equal(isRealUser(user), true);
  for (const invalid of [null, { ...user, is_anonymous: true }, { ...user, email: '' }, { ...user, email_confirmed_at: null }]) assert.equal(isRealUser(invalid), false);
});
test('persisted sessions are verified by Supabase and mismatched/revoked identities are rejected', async () => {
  const client = { auth: { getUser: async (token) => { assert.equal(token, session.access_token); return { data: { user }, error: null }; } } };
  assert.equal(await verifySession(client, null), null);
  assert.deepEqual(await verifySession(client, session), session);
  await assert.rejects(verifySession(client, { ...session, user: { ...user, id: 'tampered' } }), /account_required/);
  client.auth.getUser = async () => ({ data: { user: null }, error: new Error('revoked') });
  await assert.rejects(verifySession(client, session), /revoked/);
});
test('password login preserves password bytes, normalizes email and verifies returned identity', async () => {
  const client = { auth: {
    signInWithPassword: async (input) => { assert.deepEqual(input, { email: user.email, password: ' password ' }); return { data: { session }, error: null }; },
    getUser: async () => ({ data: { user }, error: null }),
  } };
  assert.deepEqual(await signInWithAccount(client, { email: ' PERSON@EXAMPLE.COM ', password: ' password ' }), session);
  client.auth.signInWithPassword = async () => ({ data: { session: null }, error: { code: 'invalid_credentials' } });
  await assert.rejects(signInWithAccount(client, { email: user.email, password: 'bad' }), { code: 'invalid_credentials' });
});
test('signup without a confirmed session never grants access and sends only profile metadata', async () => {
  const client = { auth: { signUp: async (input) => {
    assert.deepEqual(input, { email: user.email, password: 'password123', options: { data: { full_name: 'Persona' }, emailRedirectTo: 'hackmty2026mobile://auth/callback' } });
    return { data: { session: null }, error: null };
  } } };
  assert.equal(await registerAccount(client, { email: user.email, password: 'password123', fullName: ' Persona ' }, 'hackmty2026mobile://auth/callback'), null);
  await assert.rejects(registerAccount(client, { email: user.email, password: 'short', fullName: 'Persona' }, 'unused'));
});
test('auth errors never display raw server messages or tokens', () => {
  assert.match(authErrorMessage({ code: 'invalid_credentials', message: 'secret token' }), /correo o la contraseña/);
  assert.doesNotMatch(authErrorMessage({ message: 'private backend error secret' }), /secret|backend/);
});
