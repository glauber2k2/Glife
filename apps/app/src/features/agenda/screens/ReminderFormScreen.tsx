// Novo lembrete / editar lembrete (versão básica): título, data, hora, repetição e notas.
import { localNow } from '@glife/domain/time';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useEntityForm } from '@/shared/hooks/useEntityForm';
import { BackHeader, Button, EmptyState, Tag, DateInput, Input, RepeatFields, Screen, TimeInput, makeStyles } from '@/shared/ui';

import { emptyReminderForm, readReminderForm, reminderToForm } from '../components/forms';
import { useAgenda } from '../hooks/AgendaData';

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
      <View style={s.pair}>
        <View style={s.grow}>
          <DateInput label="Data" value={form.date} onChange={(date) => setForm({ date })} />
        </View>
        <View style={s.grow}>
          <TimeInput label="Hora" value={form.time} onChange={(time) => setForm({ time })} />
        </View>
      </View>
      <RepeatFields value={form.repeat} onChange={(repeat) => setForm({ repeat })} />
      <Input label="Notas" value={form.notes} onChangeText={(notes) => setForm({ notes })} multiline maxLength={1000} />
      {f.entity?.done_at && <Tag tone="success" label="Concluído" />}
      <Button label="Salvar" onPress={() => void f.save()} loading={f.saving} haptic fullWidth />
      {!f.isNew && <Button label="Excluir lembrete" variant="danger" onPress={() => void f.remove()} fullWidth />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0 },
  pair: { flexDirection: 'row', gap: t.space[3] },
}));
