import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { useSession } from '@/features/auth/session-provider';
import { AuthField } from '@/features/auth/auth-field';
import { authErrorMessage } from '@/features/auth/auth-service';
import { AccessibilitySettings } from '@/features/accessibility/accessibility-settings';

type Mode = 'sign-in' | 'sign-up' | 'recover';
export default function SignInScreen() {
  const auth = useSession();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accessibility, setAccessibility] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'info' | 'danger'; message: string } | null>(null);
  const title = mode === 'sign-in' ? 'Inicia sesión' : mode === 'sign-up' ? 'Crea tu cuenta' : 'Recupera tu contraseña';
  function changeMode(next: Mode) { setMode(next); setFeedback(null); setPassword(''); setConfirmation(''); setShowPassword(false); }
  async function submit() {
    if (busy || !auth.isConfigured) return;
    setBusy(true); setFeedback(null);
    try {
      if (mode === 'sign-in') {
        await auth.signIn(email, password);
      } else if (mode === 'sign-up') {
        if (password !== confirmation) { setFeedback({ tone: 'danger', message: 'Las contraseñas no coinciden.' }); return; }
        const signedIn = await auth.signUp(email, password, name);
        if (!signedIn) {
          setPassword(''); setConfirmation('');
          setEmail(email.trim().toLowerCase());
          setMode('sign-in');
          setFeedback({ tone: 'info', message: 'No se pudo iniciar la sesión automáticamente. Intenta ingresar con tu correo y contraseña.' });
        }
      } else {
        await auth.requestPasswordReset(email);
        setFeedback({ tone: 'info', message: 'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Ábrelo en este dispositivo.' });
      }
    } catch (cause) { setFeedback({ tone: 'danger', message: authErrorMessage(cause) }); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Page><View style={{ gap: 20, paddingTop: 40, paddingBottom: 24 }}>
    <ThemedText accessibilityRole="header" style={{ fontSize: 30, fontWeight: '700' }}>{title}</ThemedText>
    <ThemedText themeColor="textSecondary">Necesitas una cuenta para utilizar la aplicación.</ThemedText>
    {mode === 'sign-in' && <View style={{ gap: 8 }}><ThemedText>¿Es tu primera vez aquí?</ThemedText><ActionButton label="Crear una cuenta" variant="secondary" fullWidth disabled={busy} onPress={() => changeMode('sign-up')} /></View>}
    {!auth.isConfigured && <InfoBanner tone="danger" message="El servicio de autenticación no está configurado. No es posible acceder en este momento." />}
    {auth.error && <><InfoBanner tone="warning" message={auth.error} /><ActionButton label="Volver a verificar sesión" variant="outline" onPress={() => { void auth.retrySession(); }} /></>}
    {mode === 'sign-up' && <AuthField label="Nombre completo" value={name} onChangeText={setName} maxLength={80} autoComplete="name" textContentType="name" editable={!busy} />}
    <AuthField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
    {mode !== 'recover' && <>
      <AuthField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} textContentType={mode === 'sign-up' ? 'newPassword' : 'password'} autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} onSubmitEditing={() => { if (mode === 'sign-in') void submit(); }} />
      {mode === 'sign-up' && <><ThemedText type="small" themeColor="textSecondary">Usa al menos 8 caracteres.</ThemedText><AuthField label="Confirma tu contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showPassword} textContentType="newPassword" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} /></>}
      <ActionButton label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} variant="outline" disabled={busy} onPress={() => setShowPassword(!showPassword)} />
    </>}
    {feedback && <View accessibilityLiveRegion="polite"><InfoBanner {...feedback} /></View>}
    <ActionButton label={mode === 'sign-in' ? 'Iniciar sesión' : mode === 'sign-up' ? 'Crear cuenta' : 'Enviar enlace de recuperación'} fullWidth loading={busy} disabled={!auth.isConfigured} onPress={() => { void submit(); }} />
    {mode === 'sign-in' ? <ActionButton label="Olvidé mi contraseña" variant="outline" disabled={busy} onPress={() => changeMode('recover')} /> : <ActionButton label="Ya tengo cuenta · Iniciar sesión" variant="outline" disabled={busy} onPress={() => changeMode('sign-in')} />}
    <ActionButton label={accessibility ? 'Ocultar ajustes de accesibilidad' : 'Accesibilidad'} variant="outline" onPress={() => setAccessibility(!accessibility)} />
    {accessibility && <AccessibilitySettings />}
  </View></Page></KeyboardAvoidingView>;
}
