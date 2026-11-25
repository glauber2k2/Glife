// Campos de calendário (básicos; o visual vem no redesenho): data dd/mm/aaaa, hora HH:MM, dias da semana e repetição.
// Todos usam o teclado numérico do aparelho. O formulário guarda o texto e converte ao salvar.
import type { Frequency } from '@glife/domain/time';
import { View } from 'react-native';

import { maskDate, maskTime, weekdayShort } from '../lib/calendarInput';
import { Chip } from './Chip';
import { Input } from './Input';
import { Text } from './Text';
import { makeStyles } from './theme';

export function DateInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return <Input label={label} value={value} onChangeText={(v) => onChange(maskDate(v))} keyboardType="number-pad" placeholder="dd/mm/aaaa" maxLength={10} error={error} />;
}

export function TimeInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return <Input label={label} value={value} onChangeText={(v) => onChange(maskTime(v))} keyboardType="number-pad" placeholder="hh:mm" maxLength={5} error={error} />;
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
          <DateInput label="Até (opcional)" value={value.until} onChange={(until) => set({ until })} />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
