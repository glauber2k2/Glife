// O formulário guarda dd/mm/aaaa e HH:MM; a fronteira de plataforma abre o seletor nativo.
import type { Frequency } from '@glife/domain/time';
import { View } from 'react-native';

import { weekdayShort } from '../lib/calendarInput';
import { CalendarPicker } from './CalendarPicker';
import type { CalendarPickerProps } from './CalendarPickerField';
import { Chip } from './Chip';
import { Input } from './Input';
import { Text } from './Text';
import { makeStyles } from './theme';

export function DateInput(props: Omit<CalendarPickerProps, 'mode'>) {
  return <CalendarPicker {...props} mode="date" />;
}

export function TimeInput(props: Omit<CalendarPickerProps, 'mode'>) {
  return <CalendarPicker {...props} mode="time" />;
}

/** Sete chips (Dom … Sáb) que ligam e desligam o bit de cada dia. */
export function WeekdayPicker({ value, onChange }: { value: number; onChange: (mask: number) => void }) {
  const s = useStyles();
  return (
    <View style={s.row} accessibilityLabel="Dias da semana">
      {Array.from({ length: 7 }, (_, wd) => (
        <Chip key={wd} size="sm" label={weekdayShort(wd)} selected={(value & (1 << wd)) !== 0} onPress={() => onChange(value ^ (1 << wd))} />
      ))}
    </View>
  );
}

const FREQ_LABEL: Record<Frequency, string> = { none: 'Não repete', daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
const UNIT: Record<Frequency, string> = { none: '', daily: 'dia(s)', weekly: 'semana(s)', monthly: 'mês(es)', yearly: 'ano(s)' };

export interface RepeatValue {
  frequency: Frequency;
  /** texto do "a cada N" */
  interval: string;
  weekdays: number;
  /** texto dd/mm/aaaa ou vazio */
  until: string;
}

/** Frequência, "a cada N", dias da semana (no semanal) e data de fim opcional. */
export function RepeatFields({ value, onChange }: { value: RepeatValue; onChange: (v: RepeatValue) => void }) {
  const s = useStyles();
  const set = (patch: Partial<RepeatValue>) => onChange({ ...value, ...patch });
  return (
    <View style={s.block}>
      <Text variant="label" tone="tertiary">
        Repetição
      </Text>
      <View style={s.row}>
        {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
          <Chip key={f} size="sm" label={FREQ_LABEL[f]} selected={value.frequency === f} onPress={() => set({ frequency: f })} />
        ))}
      </View>
      {value.frequency !== 'none' && (
        <>
          <Input
            label={`A cada quantos ${UNIT[value.frequency]}`}
            value={value.interval}
            onChangeText={(v) => set({ interval: v.replace(/\D/g, '').slice(0, 2) })}
            keyboardType="number-pad"
          />
          {value.frequency === 'weekly' && <WeekdayPicker value={value.weekdays} onChange={(weekdays) => set({ weekdays })} />}
          <DateInput clearable label="Até (opcional)" value={value.until} onChange={(until) => set({ until })} />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
