// Folha "Metas do dia": kcal e macros diários, todos opcionais (campo vazio = sem meta). Uma linha de metas por dono.
import type { DietGoals } from '@glife/domain/diet';
import { Target } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Button, Sheet, Text, makeStyles, useToast } from '@/shared/ui';

import { useDiet } from '../hooks/DietData';
import { NutritionFields } from './NutritionFields';
import { nutritionToForm, readNutrition, type NutritionForm } from './nutrition';

const goalsToForm = (g: DietGoals | null): NutritionForm =>
  g
    ? nutritionToForm({ kcal: g.kcal_target, protein_g: g.protein_g_target, carbs_g: g.carbs_g_target, fat_g: g.fat_g_target })
    : { kcal: '', protein: '', carbs: '', fat: '' };

export function DietGoalsSheet({ visible, goals, onClose }: { visible: boolean; goals: DietGoals | null; onClose: () => void }) {
  // Remonta a cada abertura (os campos partem das metas atuais) sem esvaziar a folha enquanto ela desce.
  const [round, setRound] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setRound(round + 1);
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Metas do dia">
      <GoalsForm key={round} goals={goals} onClose={onClose} />
    </Sheet>
  );
}

function GoalsForm({ goals, onClose }: { goals: DietGoals | null; onClose: () => void }) {
  const s = useStyles();
  const toast = useToast();
  const { repo } = useDiet();
  const [form, setFormState] = useState(() => goalsToForm(goals));
  const [busy, setBusy] = useState(false);
  const setForm = (patch: Partial<NutritionForm>) => setFormState((f) => ({ ...f, ...patch }));

  const save = async () => {
    const r = readNutrition(form, 'Calorias');
    if (!r.ok) return toast({ message: r.error });
    setBusy(true);
    try {
      await repo.setGoals({ kcal_target: r.value.kcal, protein_g_target: r.value.protein_g, carbs_g_target: r.value.carbs_g, fat_g_target: r.value.fat_g });
      onClose();
      toast({ message: 'Metas salvas', icon: Target });
    } catch (e) {
      toast({ message: `Não foi possível salvar as metas: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text variant="small" tone="tertiary">
        Quanto comer por dia. Deixe vazio o que não quiser acompanhar.
      </Text>
      <NutritionFields form={form} onChange={setForm} withKcal kcalLabel="Calorias (kcal)" />
      <View style={s.actions}>
        <Button label="Salvar metas" fullWidth haptic loading={busy} onPress={() => void save()} />
        <Button label="Cancelar" variant="subtle" fullWidth onPress={onClose} />
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { gap: t.space[1] },
}));
