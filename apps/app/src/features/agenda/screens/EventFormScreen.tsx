// Novo evento / editar evento (versão básica). Aberto de uma ocorrência (`data`), um evento que se repete pode pular
// só aquela data.
import { localNow } from '@glife/domain/time';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useEntityForm } from '@/shared/hooks/useEntityForm';
import { errorText } from '@/shared/lib/errorText';
import { formatDateInput } from '@/shared/lib/calendarInput';
import { BackHeader, Button, EmptyState, Chip, DateInput, Input, RepeatFields, Screen, Switch, Text, TimeInput, makeStyles, useToast } from '@/shared/ui';

import { REMIND_OPTIONS, emptyEventForm, eventToForm, readEventForm } from '../components/forms';
import { useAgenda } from '../hooks/AgendaData';

const isoOk = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function EventFormScreen() {
  const s = useStyles();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; data?: string }>();
  const { repo } = useAgenda();
  const day = isoOk(params.data) ? params.data : localNow().date;
  const f = useEntityForm({
    id: params.id,
    load: (id) => repo.getEvent(id),
    toForm: eventToForm,
    empty: () => emptyEventForm(day),
    read: readEventForm,
    create: (d) => repo.createEvent(d),
    update: (id, d) => repo.updateEvent(id, d),
    remove: (id) => repo.removeEvent(id),
    restore: (id) => repo.restoreEvent(id),
    removedMessage: 'Evento excluído',
  });
  const { form, setForm } = f;

  if (f.state === 'missing') {
    return (
      <Screen>
        <BackHeader title="Evento" fallback="/agenda" />
        <EmptyState title="Não encontrado" message="Evento não encontrado." mood="pensando" />
      </Screen>
    );
  }
  if (f.state === 'loading') return <Screen>{null}</Screen>;

  const skip = async () => {
    if (!params.id || !isoOk(params.data)) return;
    try {
      await repo.skipEventDate(params.id, params.data);
      router.back();
      toast({ message: `Pulado em ${formatDateInput(params.data)}` });
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };

  return (
    <Screen>
      <BackHeader title={f.isNew ? 'Novo evento' : 'Evento'} backLabel="Agenda" fallback="/agenda" />
      <Input label="Título" value={form.title} onChangeText={(title) => setForm({ title })} maxLength={200} />
      <View style={s.switchRow}>
        <Text style={s.grow}>Dia inteiro</Text>
        <Switch label="Dia inteiro" value={form.allDay} onChange={(allDay) => setForm({ allDay })} />
      </View>
      <View style={s.pair}>
        <View style={s.grow}>
          <DateInput label="Início" value={form.startDate} onChange={(startDate) => setForm({ startDate })} />
        </View>
        {!form.allDay && (
          <View style={s.grow}>
            <TimeInput label="Hora" value={form.startTime} onChange={(startTime) => setForm({ startTime })} />
          </View>
        )}
      </View>
      <View style={s.pair}>
        <View style={s.grow}>
          <DateInput label="Fim (opcional)" value={form.endDate} onChange={(endDate) => setForm({ endDate })} />
        </View>
        {!form.allDay && (
          <View style={s.grow}>
            <TimeInput label="Hora do fim" value={form.endTime} onChange={(endTime) => setForm({ endTime })} />
          </View>
        )}
      </View>
      <Input label="Local (opcional)" value={form.location} onChangeText={(location) => setForm({ location })} maxLength={200} />
      <Input label="Notas" value={form.notes} onChangeText={(notes) => setForm({ notes })} multiline maxLength={2000} />
      <RepeatFields value={form.repeat} onChange={(repeat) => setForm({ repeat })} />
      <View style={s.block}>
        <Text variant="label" tone="tertiary">
          Aviso
        </Text>
        <View style={s.chips}>
          {REMIND_OPTIONS.map((o) => (
            <Chip key={o.label} size="sm" label={o.label} selected={form.remindBefore === o.minutes} onPress={() => setForm({ remindBefore: o.minutes })} />
          ))}
        </View>
      </View>
      <Button label="Salvar" onPress={() => void f.save()} loading={f.saving} haptic fullWidth />
      {!f.isNew && f.entity?.frequency !== 'none' && isoOk(params.data) && (
        <Button label={`Pular só ${formatDateInput(params.data)}`} variant="secondary" onPress={() => void skip()} fullWidth />
      )}
      {!f.isNew && <Button label="Excluir evento" variant="danger" onPress={() => void f.remove()} fullWidth />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0 },
  pair: { flexDirection: 'row', gap: t.space[3] },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.touch.minTarget },
  block: { gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
