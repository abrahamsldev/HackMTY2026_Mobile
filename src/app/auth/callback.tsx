import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { useSession } from '@/features/auth/session-provider';
import { authErrorMessage } from '@/features/auth/auth-service';

export default function AuthCallbackScreen() {
  const { code, error: linkError, flow } = useLocalSearchParams<{ code?: string; error?: string; flow?: string }>();
  const { completeAuthCallback } = useSession();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const complete = async () => {
      try {
        if (linkError || typeof code !== 'string' || !code || code.length > 4096) throw new Error('invalid_link');
        await completeAuthCallback(code, flow === 'recovery');
        if (active) router.replace(flow === 'recovery' ? '/reset-password' : '/');
      } catch (cause) { if (active) setError(authErrorMessage(cause)); }
    };
    void complete();
    return () => { active = false; };
  }, [code, linkError, flow, completeAuthCallback]);
  return <Page><View style={{ gap: 20, paddingTop: 40 }}><ThemedText accessibilityRole="header" type="subtitle">Verificación de cuenta</ThemedText>{error ? <><InfoBanner tone="danger" message={error} /><ActionButton label="Volver al inicio" onPress={() => router.replace('/')} /></> : <ActivityIndicator accessibilityLabel="Verificando enlace" />}</View></Page>;
}
