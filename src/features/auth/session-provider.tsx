import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { emptyProfile, clearUserSession, profileFromUser, saveUserProfile, type SaveProfileResult, type UserProfile } from './profile';
import { authErrorMessage, emailSchema, passwordSchema, registerAccount, signInWithAccount, verifySession } from './auth-service';

type SessionContextValue = {
  session: Session | null; profile: UserProfile; isLoading: boolean; isConfigured: boolean;
  error: string | null; resetVersion: number; isRecovering: boolean;
  updateProfile: (profile: UserProfile) => Promise<SaveProfileResult>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  completeAuthCallback: (code: string, recovery?: boolean) => Promise<void>;
  retrySession: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
const authRedirect = (recovery = false) => Linking.createURL('auth/callback', recovery ? { queryParams: { flow: 'recovery' } } : {});
function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const [isRecovering, setRecovering] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const generation = useRef(0);
  const alive = useRef(true);
  const callback = useRef<{ code: string; promise: Promise<void> } | null>(null);

  const validate = useCallback(async (candidate: Session | null) => {
    const revision = ++generation.current;
    try {
      const verified = await verifySession(requireClient(), candidate);
      if (alive.current && revision === generation.current) { setSession(verified); setError(null); }
    } catch (cause) {
      if (alive.current && revision === generation.current) { setSession(null); setError(authErrorMessage(cause)); }
    } finally {
      if (alive.current && revision === generation.current) setLoading(false);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    if (!supabase) return;
    const revision = generation.current;
    try {
      const { data, error: failure } = await supabase.auth.getSession();
      if (failure) throw failure;
      if (revision === generation.current) await validate(data.session);
    } catch (cause) {
      if (alive.current && revision === generation.current) { setSession(null); setError(authErrorMessage(cause)); setLoading(false); }
    }
  }, [validate]);

  const retrySession = useCallback(async () => {
    setLoading(true);
    await restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    alive.current = true;
    if (!supabase) return;
    const client = supabase;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!alive.current) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        setRecovering(false);
        generation.current += 1; setSession(null); setLoading(false); setError(null);
        setResetVersion((value) => value + 1);
        return;
      }
      // Auth methods must run after the SDK releases its auth event lock.
      const eventGeneration = ++generation.current;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (alive.current && eventGeneration === generation.current) void validate(nextSession);
      }, 0);
      timers.add(timer);
    });
    // INITIAL_SESSION is emitted by Supabase after restoring its persisted session.
    const refresh = (state: string) => {
      if (state === 'active') { void client.auth.startAutoRefresh(); void retrySession(); }
      else void client.auth.stopAutoRefresh();
    };
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    if (Platform.OS !== 'web') {
      if (AppState.currentState === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    }
    return () => {
      alive.current = false; generation.current += 1;
      timers.forEach(clearTimeout); subscription.unsubscribe(); appState?.remove();
      if (Platform.OS !== 'web') void client.auth.stopAutoRefresh();
    };
  }, [restoreSession, retrySession, validate]);

  const completeAuthCallback = useCallback((code: string, recovery = false) => {
    if (callback.current?.code === code) return callback.current.promise;
    const promise = (async () => {
      const client = requireClient();
      const { data, error: failure } = await client.auth.exchangeCodeForSession(code);
      if (failure) throw failure;
      const verified = await verifySession(client, data.session);
      if (recovery) setRecovering(true);
      if (!verified) throw new Error('account_required');
      generation.current += 1;
      setSession(verified); setError(null); setLoading(false);
    })();
    callback.current = { code, promise };
    return promise;
  }, []);

  async function signIn(email: string, password: string) {
    const verified = await signInWithAccount(requireClient(), { email, password });
    setRecovering(false);
    generation.current += 1; setSession(verified); setError(null); setLoading(false);
  }
  async function signUp(email: string, password: string, fullName: string) {
    const verified = await registerAccount(requireClient(), { email, password, fullName }, authRedirect());
    if (verified) { generation.current += 1; setSession(verified); setError(null); setLoading(false); }
    return Boolean(verified);
  }
  async function requestPasswordReset(email: string) {
    const { error: failure } = await requireClient().auth.resetPasswordForEmail(emailSchema.parse(email), { redirectTo: authRedirect(true) });
    if (failure) throw failure;
  }
  async function resendConfirmation(email: string) {
    const { error: failure } = await requireClient().auth.resend({ type: 'signup', email: emailSchema.parse(email), options: { emailRedirectTo: authRedirect() } });
    if (failure) throw failure;
  }
  async function changePassword(password: string) {
    if (!session) throw new Error('account_required');
    const { error: failure } = await requireClient().auth.updateUser({ password: passwordSchema.parse(password) });
    if (failure) throw failure;
    setRecovering(false);
  }
  async function updateProfile(input: UserProfile) {
    if (isLoading || !session) throw new Error('Inicia sesión para actualizar tus datos.');
    return saveUserProfile(input, { client: requireClient(), session, storage: AsyncStorage, redirectTo: authRedirect() });
  }
  async function signOut() {
    await clearUserSession({ client: requireClient(), session, storage: AsyncStorage });
    generation.current += 1; setSession(null); setError(null); setLoading(false);
  }
  return <SessionContext.Provider value={{ session, profile: session ? profileFromUser(session.user) : emptyProfile, isLoading, isConfigured: isSupabaseConfigured, error, resetVersion, isRecovering, updateProfile, signOut, signIn, signUp, requestPasswordReset, resendConfirmation, changePassword, completeAuthCallback, retrySession }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider.');
  return context;
}
