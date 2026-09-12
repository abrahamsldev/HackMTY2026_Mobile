import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { useSession } from '@/features/auth/session-provider';
import { accessibilityPreferencesSchema, accessibilityStorageKey, decodeAccessibilityPreferences, defaultAccessibilityPreferences, createPreferenceWriter, resolveAccessibility, type AccessibilityPreferences } from './preferences';

const initialSystem = { reduceMotion: false, boldText: false, screenReader: false };
const AccessibilityContext = createContext<{
  preferences: AccessibilityPreferences;
  settings: ReturnType<typeof resolveAccessibility>;
  colorScheme: 'light' | 'dark';
  ready: boolean;
  saving: boolean;
  error: string | null;
  update: (patch: Partial<AccessibilityPreferences>) => void;
  reset: () => void;
} | null>(null);

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const { session, isLoading } = useSession();
  const storageKey = accessibilityStorageKey(session?.user.id ?? null);
  return <PreferenceScope key={storageKey} storageKey={storageKey} sessionLoading={isLoading}>{children}</PreferenceScope>;
}

function PreferenceScope({ children, storageKey, sessionLoading }: PropsWithChildren<{ storageKey: string; sessionLoading: boolean }>) {
  const [preferences, setPreferences] = useState(defaultAccessibilityPreferences);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [system, setSystem] = useState(initialSystem);
  const current = useRef(preferences);
  const [writePreferences] = useState(() => createPreferenceWriter(AsyncStorage, storageKey));
  const revision = useRef(0);
  const mounted = useRef(true);
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    mounted.current = true;
    let active = true;
    AsyncStorage.getItem(storageKey).then((raw) => {
      const loaded = decodeAccessibilityPreferences(raw);
      if (active) { current.current = loaded; setPreferences(loaded); }
    }).catch(() => {
      if (active) setError('No se pudieron recuperar tus preferencias. Puedes volver a guardarlas.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; mounted.current = false; };
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const change = (field: keyof typeof initialSystem, value: boolean) => {
      if (active) setSystem((previous) => ({ ...previous, [field]: value }));
    };
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => change('reduceMotion', value)).catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => change('screenReader', value)).catch(() => {});
    if (Platform.OS === 'ios') void AccessibilityInfo.isBoldTextEnabled().then((value) => change('boldText', value)).catch(() => {});
    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => change('reduceMotion', value)),
      AccessibilityInfo.addEventListener('screenReaderChanged', (value) => change('screenReader', value)),
      ...(Platform.OS === 'ios' ? [AccessibilityInfo.addEventListener('boldTextChanged', (value) => change('boldText', value))] : []),
    ];
    return () => { active = false; subscriptions.forEach((subscription) => subscription.remove()); };
  }, []);

  function update(patch: Partial<AccessibilityPreferences>) {
    if (!ready || sessionLoading) return;
    const next = accessibilityPreferencesSchema.parse({ ...current.current, ...patch });
    current.current = next;
    setPreferences(next); setSaving(true); setError(null);
    const request = ++revision.current;
    // Serialize writes so rapid changes cannot persist an older snapshot last.
    void writePreferences(next).then(() => {
      if (mounted.current && request === revision.current) { setSaving(false); setError(null); }
    }).catch(() => {
      if (mounted.current && request === revision.current) { setSaving(false); setError('Los ajustes están aplicados, pero no se pudieron guardar. Intenta guardar de nuevo.'); }
    });
  }
  return <AccessibilityContext.Provider value={{ preferences, settings: resolveAccessibility(preferences, { ...system, fontScale }), colorScheme: preferences.appearance === 'system' ? scheme === 'dark' ? 'dark' : 'light' : preferences.appearance, ready: ready && !sessionLoading, saving, error, update, reset: () => update(defaultAccessibilityPreferences) }}>{children}</AccessibilityContext.Provider>;
}
export function useAccessibility() {
  const value = useContext(AccessibilityContext);
  if (!value) throw new Error('useAccessibility requires AccessibilityProvider');
  return value;
}
