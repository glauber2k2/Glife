import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { pickerDate, pickerResult } from '../lib/calendarPicker';
import { Button } from './Button';
import { CalendarPickerField, type CalendarPickerProps } from './CalendarPickerField';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { makeStyles, useTheme } from './theme';

export function CalendarPicker(props: CalendarPickerProps) {
  const { mode, label, value, onChange } = props;
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() => pickerDate(mode, value));
  const opened = useRef(false);
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  useEffect(() => () => {
    if (Platform.OS === 'android' && opened.current) void DateTimePickerAndroid.dismiss(mode).catch(() => {});
  }, [mode]);

  const open = () => {
    const date = pickerDate(mode, value);
    if (Platform.OS === 'android') {
      if (opened.current) return;
      opened.current = true;
      DateTimePickerAndroid.open({
        mode, value: date, is24Hour: true,
        positiveButton: { label: 'Confirmar' }, negativeButton: { label: 'Cancelar' },
        onValueChange: (_, selected) => {
          opened.current = false;
          const result = pickerResult(mode, 'set', selected);
          if (result !== null) onChange(result);
        },
        onDismiss: () => { opened.current = false; },
        onError: () => {
          opened.current = false;
          toast({ message: 'Não foi possível abrir o seletor. Tente novamente.' });
        },
      });
    } else {
      setDraft(date);
      setVisible(true);
    }
  };

  return (
    <>
      <CalendarPickerField {...props} onOpen={open} />
      {Platform.OS === 'ios' && (
        <Sheet visible={visible} onClose={() => setVisible(false)} title={label}>
          <DateTimePicker value={draft} mode={mode} display="spinner" locale="pt-BR" themeVariant={t.scheme} onValueChange={(_, date) => setDraft(date)} />
          <View style={s.actions}>
            <Button label="Cancelar" variant="secondary" onPress={() => setVisible(false)} />
            <Button label="Confirmar" onPress={() => {
              const result = pickerResult(mode, 'set', draft);
              if (result !== null) onChange(result);
              setVisible(false);
            }} />
          </View>
        </Sheet>
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({ actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: t.space[3] } }));
