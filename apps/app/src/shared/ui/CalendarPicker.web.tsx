import { useState } from 'react';

import { pickerWebResult, pickerWebValue } from '../lib/calendarPicker';
import { CalendarPickerField, type CalendarPickerProps } from './CalendarPickerField';
import { useTheme } from './theme';

/** Um input real do navegador abre o seletor do navegador/sistema sem empacotar módulo nativo. */
export function CalendarPicker(props: CalendarPickerProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <CalendarPickerField {...props} focused={focused}>
      <input
        type={props.mode}
        aria-label={props.label}
        aria-invalid={!!props.error}
        value={pickerWebValue(props.mode, props.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={(event) => {
          try { event.currentTarget.showPicker?.(); } catch { /* Navegador sem permissão mantém o comportamento nativo do input. */ }
        }}
        onChange={(event) => {
          const result = pickerWebResult(props.mode, event.currentTarget.value);
          if (result !== null && (result || props.clearable)) props.onChange(result);
        }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', boxSizing: 'border-box', cursor: 'pointer',
          color: 'transparent', background: 'transparent', border: 0, fontSize: t.type.body.fontSize, colorScheme: t.scheme,
          opacity: t.opacity.hidden, borderRadius: t.radius.field,
        }}
      />
    </CalendarPickerField>
  );
}
