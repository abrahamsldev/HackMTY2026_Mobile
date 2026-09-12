import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clearUserSession,
  emptyProfile,
  GUEST_PROFILE_STORAGE_KEY,
  loadGuestProfile,
  profileFromUser,
  saveUserProfile,
} from '../src/features/auth/profile.ts';
import { demoUserIdForEmail } from '../src/features/auth/demo-users.ts';

function makeStorage() {
  const values = new Map();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
}

const profile = { fullName: 'Usuario de prueba', email: 'demo@example.com' };
const session = { user: { email: profile.email } };

test('guest profile persists and restores independently of Supabase Auth', async () => {
  const storage = makeStorage();
  const result = await saveUserProfile(
    { fullName: ' Usuario de prueba ', email: ' DEMO@example.com ' },
    { client: null, session: null, storage },
  );
  assert.equal(result.savedLocally, true);
  assert.deepEqual(await loadGuestProfile(storage), profile);
  await clearUserSession({ client: null, session: null, storage });
  assert.deepEqual(await loadGuestProfile(storage), emptyProfile);
});

test('invalid input never changes persistent data', async () => {
  const storage = makeStorage();
  await assert.rejects(saveUserProfile({ ...profile, email: 'invalid' }, { client: null, session: null, storage }));
  assert.equal(await storage.getItem(GUEST_PROFILE_STORAGE_KEY), null);
});

test('authenticated updates use Auth metadata and leave guest data separate', async () => {
  const storage = makeStorage();
  let attributes;
  const client = { auth: { updateUser: async (input) => {
    attributes = input;
    return { data: { user: session.user }, error: null };
  } } };
  const result = await saveUserProfile(profile, { client, session, storage });
  assert.deepEqual(attributes, { data: { full_name: profile.fullName } });
  assert.equal(result.savedLocally, false);
  assert.equal(result.emailConfirmationRequired, false);
  assert.equal(await storage.getItem(GUEST_PROFILE_STORAGE_KEY), null);
});

test('email changes distinguish pending confirmation from immediate updates', async () => {
  const storage = makeStorage();
  const nextProfile = { ...profile, email: 'updated@example.com' };
  const client = { auth: { updateUser: async (input) => {
    assert.equal(input.email, nextProfile.email);
    return { data: { user: session.user }, error: null };
  } } };
  assert.equal((await saveUserProfile(nextProfile, { client, session, storage })).emailConfirmationRequired, true);
  client.auth.updateUser = async () => ({ data: { user: { email: nextProfile.email } }, error: null });
  assert.equal((await saveUserProfile(nextProfile, { client, session, storage })).emailConfirmationRequired, false);
});

test('Auth errors propagate instead of reporting a successful update', async () => {
  const failure = new Error('offline');
  const client = { auth: { updateUser: async () => ({ data: { user: null }, error: failure }) } };
  await assert.rejects(saveUserProfile(profile, { client, session, storage: makeStorage() }), failure);
});

test('logout clears demo data and only signs out the current device', async () => {
  const storage = makeStorage();
  await storage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  let scope;
  const client = { auth: { signOut: async (options) => {
    scope = options.scope;
    assert.equal(await storage.getItem(GUEST_PROFILE_STORAGE_KEY), null);
    return { error: null };
  } } };
  await clearUserSession({ client, session, storage });
  assert.equal(scope, 'local');
});

test('logout failure propagates so the UI can offer a retry', async () => {
  const failure = new Error('network failure');
  const client = { auth: { signOut: async () => ({ error: failure }) } };
  await assert.rejects(clearUserSession({ client, session, storage: makeStorage() }), failure);
});

test('invalid metadata cannot become a displayed name', () => {
  assert.deepEqual(profileFromUser({ email: profile.email, user_metadata: { full_name: { invalid: true } } }), { fullName: '', email: profile.email });
});

test('configured demo emails resolve to canonical ids and unknown emails fail closed', () => {
  assert.equal(
    demoUserIdForEmail('  ANA.DEMO@FluidBank.test  '),
    '68dc4d66-07b8-5893-95f1-07f06989a552',
  );
  assert.equal(demoUserIdForEmail('unknown@example.com'), null);
});
