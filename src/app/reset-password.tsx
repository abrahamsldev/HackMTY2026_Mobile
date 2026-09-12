import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { AuthField } from '@/features/auth/auth-field';
import { authErrorMessage } from '@/features/auth/auth-service';
import { useSession } from '@/features/auth/session-provider';

export default function ResetPasswordScreen() {
  const { changePassword, signOut } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (busy) return;
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true); setError(null);
    try { await changePassword(password); setPassword(''); setConfirmation(''); setSaved(true); }
    catch (cause) { setError(authErrorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Page><View style={{ gap: 20, paddingTop: 40 }}><ThemedText accessibilityRole="header" style={{ fontSize: 28 }}>Cambia tu contraseña</ThemedText>
    {saved ? <><InfoBanner tone="success" message="Tu contraseña se actualizó correctamente." /><ActionButton label="Continuar" onPress={() => router.replace('/')} /></> : <>
      <ThemedText>Usa al menos 8 caracteres.</ThemedText>
      <AuthField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} />
      <AuthField label="Confirma tu contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} />
      {error && <InfoBanner tone="danger" message={error} />}
      <ActionButton label="Guardar contraseña" loading={busy} onPress={() => { void save(); }} />
      <ActionButton label="Cancelar y cerrar sesión" variant="outline" disabled={busy} onPress={() => { void signOut().catch((cause) => setError(authErrorMessage(cause))); }} />
    </>}
  </View></Page></KeyboardAvoidingView>;
}
