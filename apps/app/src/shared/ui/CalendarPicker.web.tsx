import { useState } from 'react';

import { pickerWebResult, pickerWebValue } from '../lib/calendarPicker';
import { CalendarPickerField, type CalendarPickerProps } from './CalendarPickerField';
import { useTheme } from './theme';

/** A real browser input opens the browser/OS picker without bundling a native module. */
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
          try { event.currentTarget.showPicker?.(); } catch { /* Browsers without permission retain their native input behavior. */ }
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
