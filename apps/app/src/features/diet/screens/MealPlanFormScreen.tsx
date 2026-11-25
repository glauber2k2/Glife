// Refeição do plano: nome, horário, o que comer, dias da semana e aviso no horário (versão básica).
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useEntityForm } from '@/shared/hooks/useEntityForm';
import { BackHeader, Button, Input, Screen, Switch, Text, TimeInput, WeekdayPicker, makeStyles } from '@/shared/ui';

import { emptyPlanForm, planToForm, readPlanForm } from '../components/forms';
import { useDiet } from '../hooks/DietData';

export function MealPlanFormScreen() {
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string }>();
  const { repo } = useDiet();
  const f = useEntityForm({
    id: params.id,
    load: (id) => repo.getPlanItem(id),
    toForm: planToForm,
    empty: emptyPlanForm,
    read: readPlanForm,
    create: (d) => repo.createPlanItem(d),
    update: (id, d) => repo.updatePlanItem(id, d),
    remove: (id) => repo.removePlanItem(id),
    restore: (id) => repo.restorePlanItem(id),
    removedMessage: 'Refeição tirada do plano',
  });
  const { form, setForm } = f;

  if (f.state === 'missing') {
    return (
      <Screen>
        <BackHeader title="Refeição" fallback="/dieta" />
        <Text tone="tertiary">Refeição não encontrada.</Text>
      </Screen>
    );
  }
  if (f.state === 'loading') return <Screen>{null}</Screen>;

  return (
    <Screen>
      <BackHeader title={f.isNew ? 'Nova refeição' : 'Refeição do plano'} backLabel="Dieta" fallback="/dieta" />
      <Input label="Nome (ex.: Almoço)" value={form.name} onChangeText={(name) => setForm({ name })} maxLength={80} />
      <TimeInput label="Horário" value={form.time} onChange={(time) => setForm({ time })} />
      <Input label="O que comer" value={form.description} onChangeText={(description) => setForm({ description })} multiline maxLength={500} />
      <View style={s.block}>
        <Text variant="label" tone="tertiary">
          Dias em que vale
        </Text>
        <WeekdayPicker value={form.weekdays} onChange={(weekdays) => setForm({ weekdays })} />
      </View>
      <View style={s.switchRow}>
        <Text style={s.grow}>Avisar no horário</Text>
        <Switch label="Avisar no horário" value={form.remind} onChange={(remind) => setForm({ remind })} />
      </View>
      <Button label="Salvar" onPress={() => void f.save()} loading={f.saving} haptic fullWidth />
      {!f.isNew && <Button label="Tirar do plano" variant="ghost" onPress={() => void f.remove()} fullWidth />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0 },
  block: { gap: t.space[3] },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.touch.minTarget },
}));
