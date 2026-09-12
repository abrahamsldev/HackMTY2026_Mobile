import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import {
  emptyProfile,
  clearUserSession,
  loadGuestProfile,
  profileFromUser,
  saveUserProfile,
  type SaveProfileResult,
  type UserProfile,
} from './profile';

type SessionContextValue = {
  session: Session | null;
  profile: UserProfile;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  resetVersion: number;
  updateProfile: (profile: UserProfile) => Promise<SaveProfileResult>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [guestProfile, setGuestProfile] = useState(emptyProfile);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [guestLoading, setGuestLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    let active = true;
    loadGuestProfile(AsyncStorage)
      .then((profile) => {
        if (active) setGuestProfile(profile);
      })
      .catch(() => {
        if (active) setError('No se pudieron recuperar los datos locales.');
      })
      .finally(() => {
        if (active) setGuestLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let authEventReceived = false;

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      // Keep this callback synchronous: calling Auth methods here can deadlock.
      authEventReceived = true;
      setSession(nextSession);
      setAuthLoading(false);
      setError(null);
    });

    client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active || authEventReceived) return;
        if (sessionError) throw sessionError;
        setSession(data.session);
      })
      .catch(() => {
        if (active && !authEventReceived) setError('No se pudo recuperar la sesión.');
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    const refreshSession = (state: string) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    };
    // The web client handles visibility itself. Native refresh follows AppState.
    const appStateSubscription = Platform.OS !== 'web'
      ? AppState.addEventListener('change', refreshSession)
      : undefined;
    if (Platform.OS !== 'web') refreshSession(AppState.currentState);

    return () => {
      active = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') void client.auth.stopAutoRefresh();
    };
  }, []);

  async function updateProfile(input: UserProfile): Promise<SaveProfileResult> {
    if (authLoading || guestLoading) throw new Error('Espera a que se carguen los datos.');
    const result = await saveUserProfile(input, {
      client: supabase,
      session,
      storage: AsyncStorage,
    });
    if (result.savedLocally) setGuestProfile(result.profile);
    return result;
  }

  async function signOut() {
    if (authLoading || guestLoading) throw new Error('Espera a que se carguen los datos.');
    await clearUserSession({ client: supabase, session, storage: AsyncStorage });
    setGuestProfile(emptyProfile);
    setSession(null);
    setError(null);
    setResetVersion((version) => version + 1);
  }

  return (
    <SessionContext.Provider value={{
      session,
      profile: session ? profileFromUser(session.user) : guestProfile,
      isLoading: authLoading || guestLoading,
      isConfigured: isSupabaseConfigured,
      error,
      resetVersion,
      updateProfile,
      signOut,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider.');
  return context;
}
