import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { useTheme } from '@/hooks/use-theme';
import { useAccessibility } from './accessibility-provider';
import type { AccessibilityPreferences } from './preferences';

export function AccessibilitySettings() {
  const { preferences, settings, ready, saving, error, update, reset } = useAccessibility();
  const theme = useTheme();
  function choices<K extends keyof AccessibilityPreferences>(key: K, label: string, items: { label: string; value: AccessibilityPreferences[K] }[]) {
    return <View style={styles.group}><ThemedText type="smallBold">{label}</ThemedText><View style={styles.choices}>{items.map((item) => <Pressable key={String(item.value)} disabled={!ready} accessibilityRole="radio" accessibilityLabel={`${label}: ${item.label}`} accessibilityState={{ checked: preferences[key] === item.value, disabled: !ready }} onPress={() => update({ [key]: item.value })} style={[styles.choice, { backgroundColor: preferences[key] === item.value ? theme.backgroundSelected : theme.background, borderColor: preferences[key] === item.value ? theme.text : theme.border }]}><ThemedText>{preferences[key] === item.value ? '✓ ' : ''}{item.label}</ThemedText></Pressable>)}</View></View>;
  }
  function toggle(key: 'boldText' | 'highContrast' | 'reduceMotion' | 'largeTargets' | 'chartDataTable', label: string, description: string) {
    return <Pressable disabled={!ready} accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={description} accessibilityState={{ checked: preferences[key], disabled: !ready }} onPress={() => update({ [key]: !preferences[key] })} style={[styles.toggle, { borderColor: theme.border }]}><ThemedText type="smallBold">{label} · {preferences[key] ? 'Activado' : 'Desactivado'}</ThemedText><ThemedText type="small" themeColor="textSecondary">{description}</ThemedText></Pressable>;
  }
  return <View style={styles.section}>
    <ThemedText accessibilityRole="header" style={{ fontSize: 28 }}>Accesibilidad</ThemedText>
    <ThemedText themeColor="textSecondary">Personaliza cómo lees y utilizas la aplicación. Los cambios se aplican al instante y se guardan para tu perfil en este dispositivo.</ThemedText>
    {!ready && <ActivityIndicator accessibilityLabel="Cargando preferencias" />}
    {choices('textScale', 'Tamaño del texto', [{ label: '100 %', value: 1 }, { label: '125 %', value: 1.25 }, { label: '150 %', value: 1.5 }, { label: '200 %', value: 2 }])}
    <ThemedText type="small" themeColor="textSecondary">Se combina con el tamaño de letra del sistema, sin limitarlo.</ThemedText>
    {choices('lineSpacing', 'Interlineado', [{ label: 'Normal', value: 1 }, { label: 'Amplio', value: 1.3 }, { label: 'Muy amplio', value: 1.6 }])}
    {choices('letterSpacing', 'Separación entre letras', [{ label: 'Normal', value: 0 }, { label: '+1', value: 1 }, { label: '+2', value: 2 }])}
    {toggle('boldText', 'Texto en negritas', 'Refuerza el grosor del texto. También respeta las negritas del sistema en iOS.')}
    {choices('appearance', 'Apariencia', [{ label: 'Sistema', value: 'system' }, { label: 'Clara', value: 'light' }, { label: 'Oscura', value: 'dark' }])}
    {toggle('highContrast', 'Alto contraste', 'Refuerza los textos secundarios y los bordes de los controles y tarjetas.')}
    {choices('colorPalette', 'Paleta de colores', [{ label: 'Estándar', value: 'default' }, { label: 'Azul y naranja', value: 'blue-orange' }, { label: 'Monocromática', value: 'monochrome' }])}
    <ThemedText type="small" themeColor="textSecondary">Azul y naranja ofrece una alternativa a rojo y verde. Los estados conservan sus etiquetas y los gráficos permiten consultar valores sin depender del color.</ThemedText>
    {toggle('reduceMotion', 'Reducir movimiento', 'Desactiva las animaciones decorativas. La preferencia de movimiento reducido del sistema siempre se respeta.')}
    {toggle('largeTargets', 'Controles grandes', 'Amplía botones y campos a un mínimo de 64 puntos; ofrece controles de detalle para los gráficos.')}
    {toggle('chartDataTable', 'Mostrar datos de los gráficos', 'Añade una lista de fechas, etiquetas y valores. Se activa también con texto ampliado, controles grandes o lector de pantalla detectado.')}
    <View style={[styles.preview, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}><ThemedText type="smallBold">Vista previa</ThemedText><ThemedText>Tu saldo disponible es de $12,450.00 MXN.</ThemedText><InfoBanner title="Recordatorio" message="Tu próximo pago vence el día 20." /><ActionButton label="Botón de ejemplo" variant="outline" onPress={() => {}} /><ThemedText type="small">Controles: {settings.minTargetSize} puntos · Movimiento reducido: {settings.reduceMotion ? 'sí' : 'no'}</ThemedText></View>
    <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">{!ready ? 'Cargando…' : saving ? 'Guardando preferencias…' : error ? 'Cambios pendientes de guardar.' : 'Preferencias guardadas en este dispositivo.'}</ThemedText>
    {error && <><InfoBanner tone="warning" message={error} /><ActionButton label="Reintentar guardado" onPress={() => update({})} /></>}
    <ActionButton label="Restablecer accesibilidad" variant="outline" disabled={!ready} onPress={reset} />
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 20, paddingVertical: 24 }, group: { gap: 8 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { padding: 12, borderWidth: 1, borderRadius: 10, justifyContent: 'center', maxWidth: '100%' }, toggle: { gap: 8, borderWidth: 1, borderRadius: 12, padding: 14 }, preview: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 } });
