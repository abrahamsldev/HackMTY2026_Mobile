import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Expo only exposes statically referenced EXPO_PUBLIC_* variables to the app.
// Never use a service-role key here. Supabase Auth only needs a public key.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function hasValidConfig(): boolean {
  if (!url || !publicKey) return false;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = hasValidConfig();

// Missing configuration leaves only the sign-in screen available.
export const supabase = isSupabaseConfigured
  ? createClient(url!, publicKey!, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage, lock: processLock } : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
