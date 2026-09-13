import { useTheme } from '@/hooks/use-theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
export function DateInput({ value, label, disabled, onChange }: { value: string; label: string; disabled: boolean; onChange: (value: string) => void }) {
  const theme = useTheme(); const { settings } = useAccessibility();
  return <input type="date" aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} style={{ minHeight: settings.minTargetSize, fontSize: 16 * settings.textScale, maxWidth: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: settings.highContrast ? `1px solid ${theme.border}` : 'none', background: theme.backgroundElement, color: theme.text, colorScheme: 'normal' }} />;
}
