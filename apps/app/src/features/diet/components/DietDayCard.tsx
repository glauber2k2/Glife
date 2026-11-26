// Cartão do dia (protótipo "dieta"): anel das kcal restantes até a meta e barras de proteína, carboidratos e gorduras
// ("consumido/meta g"). Sem metas, mostra o que já foi comido e convida a definir metas; com metas, tocar edita.
import type { DietGoals, NutritionTotals } from '@glife/domain/diet';
import { View } from 'react-native';

import { Button, Card, ProgressBar, ProgressRing, Text, makeStyles, useTheme } from '@/shared/ui';

import { gramsText, kcalText } from './nutrition';

export function DietDayCard({ totals, goals, onEditGoals }: { totals: NutritionTotals; goals: DietGoals | null; onEditGoals: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const target = goals?.kcal_target ?? null;
  const left = target !== null ? target - totals.kcal : null;
  const over = left !== null && left < 0;
  const hasGoals = !!goals && [goals.kcal_target, goals.protein_g_target, goals.carbs_g_target, goals.fat_g_target].some((v) => v !== null);
  const macros: [string, number, number | null][] = [
    ['Proteína', totals.protein_g, goals?.protein_g_target ?? null],
    ['Carboidratos', totals.carbs_g, goals?.carbs_g_target ?? null],
    ['Gorduras', totals.fat_g, goals?.fat_g_target ?? null],
  ];

  return (
    <Card
      gap={t.space[4]}
      onPress={hasGoals ? onEditGoals : undefined}
      accessibilityLabel={hasGoals ? 'Calorias e macros do dia. Toque para editar as metas.' : undefined}
    >
      <View style={s.row}>
        <ProgressRing value={target ? totals.kcal / target : 0} tone={over ? 'danger' : 'success'}>
          <Text variant="title2" numeric>
            {kcalText(left !== null ? Math.abs(left) : totals.kcal)}
          </Text>
          <Text variant="micro" tone="tertiary" align="center">
            {left === null ? 'kcal hoje' : over ? 'kcal acima' : 'kcal restantes'}
          </Text>
        </ProgressRing>
        <View style={s.macros}>
          {macros.map(([label, value, goal]) => (
            <View key={label} style={s.macro}>
              <View style={s.macroHead}>
                <Text variant="caption" numberOfLines={1} style={s.shrink}>
                  {label}
                </Text>
                <Text variant="caption" tone="tertiary" numeric numberOfLines={1}>
                  {goal !== null ? `${gramsText(value)}/${gramsText(goal)} g` : `${gramsText(value)} g`}
                </Text>
              </View>
              <ProgressBar
                value={goal ? value / goal : 0}
                tone={goal !== null && value > goal ? 'danger' : 'neutral'}
                thickness="thin"
                label={goal !== null ? `${label}: ${gramsText(value)} de ${gramsText(goal)} gramas` : `${label}: ${gramsText(value)} gramas`}
              />
            </View>
          ))}
        </View>
      </View>
      {!hasGoals && (
        <View style={s.invite}>
          <Text variant="small" tone="tertiary" style={s.grow}>
            Defina metas para ver quanto falta no dia.
          </Text>
          <Button label="Definir metas" size="sm" variant="secondary" selfAlign="center" onPress={onEditGoals} />
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[5] },
  macros: { flex: 1, minWidth: 0, gap: t.space[3] },
  macro: { gap: t.space[1] },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', gap: t.space[2] },
  shrink: { flexShrink: 1, minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
}));
