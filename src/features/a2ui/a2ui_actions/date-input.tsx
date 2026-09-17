import { useState } from 'react';
import { Platform, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ActionButton } from '@/components/ui/action-button';
import { useTheme } from '@/hooks/use-theme';
import { validDate } from './model';

export function DateInput({ value, label, disabled, onChange }: { value: string; label: string; disabled: boolean; onChange: (value: string) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = validDate(value) ? new Date(`${value}T12:00:00`) : new Date();
  return <View><ActionButton label={`${label}: ${validDate(value) ? selected.toLocaleDateString('es-MX') : 'Seleccionar fecha'}`} variant="secondary" disabled={disabled} onPress={() => setOpen(!open)} />
    {open && <DateTimePicker value={selected} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} disabled={disabled} accentColor={theme.accent}
      onValueChange={(_event, date) => {
        if (Platform.OS === 'android') setOpen(false);
        if (date) onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      }}
      onDismiss={() => setOpen(false)} />}
  </View>;
}
