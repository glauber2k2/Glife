import { CalendarDays, Clock, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import type { CalendarMode } from '../lib/calendarPicker';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Input } from './Input';
import { makeStyles } from './theme';

export interface CalendarPickerProps {
  mode: CalendarMode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  clearable?: boolean;
}

/** Shared appearance; platform adapters own the picker and its lifecycle. */
export function CalendarPickerField({ mode, label, value, onChange, error, clearable, onOpen, focused, children }: CalendarPickerProps & { onOpen?: () => void; focused?: boolean; children?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <Pressable
        style={[s.field, focused && s.focused]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'Selecionar'}`}
        accessibilityHint={`Abrir seletor de ${mode === 'date' ? 'data' : 'hora'}`}
        accessible={!children}
        focusable={!children}
        onPress={onOpen}
      >
        <View pointerEvents="none">
          <Input label={label} value={value} error={error} readOnly accessible={false} tabIndex={-1} trailing={<View style={s.icon}><Icon icon={mode === 'date' ? CalendarDays : Clock} color="textTertiary" /></View>} />
        </View>
        {children}
      </Pressable>
      {clearable && <IconButton icon={X} label={`Limpar ${label.toLowerCase()}`} variant="ghost" disabled={!value} onPress={() => onChange('')} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  field: { flex: 1, minWidth: 0 },
  focused: { borderRadius: t.radius.field, boxShadow: `0px 0px 0px ${t.field.ring}px ${t.colors.accent}` },
  icon: { width: t.size.iconButton, height: t.size.iconButton, alignItems: 'center', justifyContent: 'center' },
}));
