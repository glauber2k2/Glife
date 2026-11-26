// Registro de refeição: data, hora, o que comeu e (opcional) a refeição do plano a que corresponde (versão básica).
import { planFor } from '@glife/domain/diet';
import { localNow } from '@glife/domain/time';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useEntityForm } from '@/shared/hooks/useEntityForm';
import { parseDateInput } from '@/shared/lib/calendarInput';
import { BackHeader, Button, EmptyState, Chip, DateInput, Input, Screen, Text, TimeInput, makeStyles } from '@/shared/ui';

import { emptyLogForm, logToForm, readLogForm } from '../components/forms';
import { useDiet } from '../hooks/DietData';

const isoOk = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function MealLogFormScreen() {
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string; data?: string }>();
  const { repo, data } = useDiet();
  const now = localNow();
  const f = useEntityForm({
    id: params.id,
    load: (id) => repo.getLog(id),
    toForm: logToForm,
    empty: () => emptyLogForm(isoOk(params.data) ? params.data : now.date, now.time, null),
    read: readLogForm,
    create: (d) => repo.createLog(d),
    update: (id, d) => repo.updateLog(id, d),
    remove: (id) => repo.removeLog(id),
    restore: (id) => repo.restoreLog(id),
    removedMessage: 'Registro excluído',
  });
  const { form, setForm } = f;

  if (f.state === 'missing') {
    return (
      <Screen>
        <BackHeader title="Registro" fallback="/dieta" />
        <EmptyState title="Não encontrado" message="Registro não encontrado." mood="pensando" />
      </Screen>
    );
  }
  if (f.state === 'loading') return <Screen>{null}</Screen>;

  // Refeições do plano que valem na data escolhida (para ligar o registro a uma delas).
  const date = parseDateInput(form.date);
  const options = data && date ? planFor(data.plan, date) : [];

  return (
    <Screen>
      <BackHeader title={f.isNew ? 'Registrar refeição' : 'Registro'} backLabel="Dieta" fallback="/dieta" />
      <View style={s.pair}>
        <View style={s.grow}>
          <DateInput label="Data" value={form.date} onChange={(d) => setForm({ date: d })} />
        </View>
        <View style={s.grow}>
          <TimeInput label="Hora" value={form.time} onChange={(time) => setForm({ time })} />
        </View>
      </View>
      {options.length > 0 && (
        <View style={s.block}>
          <Text variant="label" tone="tertiary">
            Refeição do plano
          </Text>
          <View style={s.chips}>
            <Chip size="sm" label="Fora do plano" selected={form.planId === null} onPress={() => setForm({ planId: null })} />
            {options.map((p) => (
              <Chip key={p.id} size="sm" label={`${p.time} ${p.name}`} selected={form.planId === p.id} onPress={() => setForm({ planId: p.id })} />
            ))}
          </View>
        </View>
      )}
      <Input label="O que comeu" value={form.description} onChangeText={(description) => setForm({ description })} multiline maxLength={500} />
      <Button label="Salvar" onPress={() => void f.save()} loading={f.saving} haptic fullWidth />
      {!f.isNew && <Button label="Excluir registro" variant="danger" onPress={() => void f.remove()} fullWidth />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0 },
  pair: { flexDirection: 'row', gap: t.space[3] },
  block: { gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
