// Novo lembrete / editar lembrete (versão básica): título, data, quantas vezes no dia (uma vez, lista de horários ou
// intervalo), repetição e notas.
import { localNow } from '@glife/domain/time';
import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useEntityForm } from '@/shared/hooks/useEntityForm';
import { BackHeader, Button, Chip, DateInput, EmptyState, Input, RepeatFields, Screen, SegmentedControl, Tag, Text, TimeInput, makeStyles } from '@/shared/ui';

import {
  EVERY_OPTIONS,
  addReminderTime,
  emptyReminderForm,
  previewReminderTimes,
  readReminderForm,
  reminderToForm,
  type ReminderMode,
} from '../components/forms';
import { useAgenda } from '../hooks/AgendaData';

const MODES: readonly { value: ReminderMode; label: string }[] = [
  { value: 'once', label: 'Uma vez' },
  { value: 'list', label: 'Horários' },
  { value: 'interval', label: 'Intervalo' },
];

/** "8 vezes: 08:00, 10:00, 12:00 …" (os 6 primeiros). */
function timesSummary(times: readonly string[]): string {
  if (times.length === 0) return '';
  const shown = times.slice(0, 6).join(', ');
  return `${times.length} ${times.length === 1 ? 'vez' : 'vezes'} no dia: ${shown}${times.length > 6 ? ' …' : ''}`;
}

const isoOk = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function ReminderFormScreen() {
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string; data?: string }>();
  const { repo } = useAgenda();
  const day = isoOk(params.data) ? params.data : localNow().date;
  const f = useEntityForm({
    id: params.id,
    load: (id) => repo.getReminder(id),
    toForm: reminderToForm,
    empty: () => emptyReminderForm(day),
    read: readReminderForm,
    create: (d) => repo.createReminder(d),
    update: (id, d) => repo.updateReminder(id, d),
    remove: (id) => repo.removeReminder(id),
    restore: (id) => repo.restoreReminder(id),
    removedMessage: 'Lembrete excluído',
  });
  const { form, setForm } = f;
  const [newTime, setNewTime] = useState('');
  const summary = timesSummary(previewReminderTimes(form));

  if (f.state === 'missing') {
    return (
      <Screen>
        <BackHeader title="Lembrete" fallback="/agenda" />
        <EmptyState title="Não encontrado" message="Lembrete não encontrado." mood="pensando" />
      </Screen>
    );
  }
  if (f.state === 'loading') return <Screen>{null}</Screen>;

  return (
    <Screen>
      <BackHeader title={f.isNew ? 'Novo lembrete' : 'Lembrete'} backLabel="Agenda" fallback="/agenda" />
      <Input label="O que lembrar" value={form.title} onChangeText={(title) => setForm({ title })} maxLength={200} />
      <View style={s.block}>
        <Text variant="label" tone="tertiary">
          Quantas vezes no dia
        </Text>
        <SegmentedControl label="Quantas vezes no dia" shape="block" options={MODES} value={form.mode} onChange={(mode) => setForm({ mode })} />
      </View>
      {form.mode === 'once' ? (
        <View style={s.pair}>
          <View style={s.grow}>
            <DateInput label="Data" value={form.date} onChange={(date) => setForm({ date })} />
          </View>
          <View style={s.grow}>
            <TimeInput label="Hora" value={form.time} onChange={(time) => setForm({ time })} />
          </View>
        </View>
      ) : (
        <DateInput label={form.repeat.frequency === 'none' ? 'Data' : 'A partir de'} value={form.date} onChange={(date) => setForm({ date })} />
      )}
      {form.mode === 'list' && (
        <View style={s.block}>
          {form.times.length > 0 && (
            <View style={s.chips}>
              {form.times.map((time) => (
                <Chip key={time} size="sm" numeric icon={X} label={time} onPress={() => setForm({ times: form.times.filter((x) => x !== time) })} />
              ))}
            </View>
          )}
          <TimeInput
            key={form.times.length}
            label="Adicionar horário"
            value={newTime}
            onChange={(v) => {
              const times = addReminderTime(form.times, v);
              if (times.length !== form.times.length) setForm({ times });
              setNewTime('');
            }}
            hint="Toque num horário para tirá-lo"
          />
        </View>
      )}
      {form.mode === 'interval' && (
        <View style={s.block}>
          <View style={s.pair}>
            <View style={s.grow}>
              <TimeInput label="Começa às" value={form.time} onChange={(time) => setForm({ time })} />
            </View>
            <View style={s.grow}>
              <TimeInput label="Termina às" value={form.endTime} onChange={(endTime) => setForm({ endTime })} />
            </View>
          </View>
          <Text variant="label" tone="tertiary">
            A cada
          </Text>
          <View style={s.chips}>
            {EVERY_OPTIONS.map((o) => (
              <Chip key={o.minutes} size="sm" label={o.label} selected={form.every === o.minutes} onPress={() => setForm({ every: o.minutes })} />
            ))}
          </View>
        </View>
      )}
      {form.mode !== 'once' && summary !== '' && (
        <Text variant="small" tone="secondary">
          {summary}
        </Text>
      )}
      <RepeatFields value={form.repeat} onChange={(repeat) => setForm({ repeat })} />
      <Input label="Notas" value={form.notes} onChangeText={(notes) => setForm({ notes })} multiline maxLength={1000} />
      {f.entity?.done_at && <Tag tone="success" label="Concluído" />}
      <Button label="Salvar" onPress={() => void f.save()} loading={f.saving} haptic fullWidth />
      {!f.isNew && <Button label="Excluir lembrete" variant="danger" onPress={() => void f.remove()} fullWidth />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  grow: { flexGrow: 1, flexBasis: t.layout.calendarFieldMinWidth, minWidth: 0 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] },
}));
