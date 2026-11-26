// Campos de kcal e macros (opcionais, teclado numérico do aparelho), no máximo 2 por linha.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Input, makeStyles } from '@/shared/ui';

import { maskGrams, maskKcal, type NutritionForm } from './nutrition';

type Field = keyof NutritionForm;
const LABELS: Record<Field, string> = { kcal: 'kcal', protein: 'Proteína (g)', carbs: 'Carboidratos (g)', fat: 'Gorduras (g)' };

export function NutritionInput({ field, label, value, onChange }: { field: Field; label?: string; value: string; onChange: (v: string) => void }) {
  const kcal = field === 'kcal';
  return (
    <Input
      label={label ?? LABELS[field]}
      placeholder="Opcional"
      value={value}
      onChangeText={(text) => onChange(kcal ? maskKcal(text) : maskGrams(text))}
      keyboardType={kcal ? 'number-pad' : 'decimal-pad'}
      maxLength={kcal ? 5 : 6}
    />
  );
}

/** Uma linha de até dois campos que dividem a largura (o segundo vazio guarda o lugar). */
export function FieldPair({ children }: { children: [ReactNode, ReactNode?] }) {
  const s = useStyles();
  return (
    <View style={s.pair}>
      <View style={s.half}>{children[0]}</View>
      <View style={s.half}>{children[1] ?? null}</View>
    </View>
  );
}

/** Macros (e, se `withKcal`, a kcal primeiro): [kcal | Proteína] [Carboidratos | Gorduras] ou [Proteína | Carboidratos] [Gorduras]. */
export function NutritionFields({
  form,
  onChange,
  withKcal,
  kcalLabel,
}: {
  form: NutritionForm;
  onChange: (patch: Partial<NutritionForm>) => void;
  withKcal: boolean;
  kcalLabel?: string;
}) {
  const input = (field: Field) => (
    <NutritionInput key={field} field={field} label={field === 'kcal' ? kcalLabel : undefined} value={form[field]} onChange={(v) => onChange({ [field]: v })} />
  );
  return withKcal ? (
    <>
      <FieldPair>{[input('kcal'), input('protein')]}</FieldPair>
      <FieldPair>{[input('carbs'), input('fat')]}</FieldPair>
    </>
  ) : (
    <>
      <FieldPair>{[input('protein'), input('carbs')]}</FieldPair>
      <FieldPair>{[input('fat')]}</FieldPair>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  pair: { flexDirection: 'row', gap: t.space[3] },
  half: { flex: 1, minWidth: 0 },
}));
