// Entradas para Gráficos: o bloco-resumo "Últimos 6 meses" em Finanças (miniatura das barras, sem toque) e
// "Mês até agora" em Hoje (gasto × orçamento, como o mês fecha com os previstos e a maior categoria).
import { daysInMonth, monthBuckets, monthSoFar, chartPeriod, type IsoDate } from '@glife/domain/finance';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text, makeStyles, useTheme } from '@/shared/ui';

import { money, signed } from '../format';
import { Block } from '../ui';
import { useFinanceMaybe } from '../../hooks/FinanceData';
import { useChartsSource } from '../../hooks/useCharts';
import { BarChart } from './BarChart';
import { BigAmount, SpendTrack } from './ChartBlocks';
import { monthLower, sharePct } from './chartFormat';
import { flowAria, flowSlots, sliceName } from './slots';

function Header({ title }: { title: string }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.header}>
      <Text variant="label" tone="tertiary">
        {title}
      </Text>
      <View style={s.link}>
        <Text variant="small" tone="accent" style={s.semibold}>
          Gráficos
        </Text>
        <Icon icon={ChevronRight} size={t.icon.small} color="accentInk" />
      </View>
    </View>
  );
}

/** Finanças: miniatura de 6 meses (56 px) e o saldo do mês; o bloco inteiro abre Gráficos em 6 meses. */
export function ChartsSummaryBlock() {
  const s = useStyles();
  const t = useTheme();
  const src = useChartsSource();
  if (!src) return null;
  const buckets = monthBuckets(src.entries, chartPeriod('6m', src.thisMonth).months);
  const now = buckets[buckets.length - 1]!;
  const net = now.income.confirmed - now.expense.confirmed;
  return (
    <Block>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${flowAria('Últimos 6 meses de entradas e saídas', 'Últimos 6 meses', buckets, true)} Saldo de ${monthLower(src.thisMonth)} ${signed(net)}. Abrir gráficos.`}
        onPress={() => router.push({ pathname: '/financas/graficos', params: { modo: '6m', de: 'Finanças' } })}
        style={({ pressed }) => [s.press, pressed && s.pressed]}
      >
        <Header title="Últimos 6 meses" />
        <View style={s.mini} pointerEvents="none">
          <BarChart slots={flowSlots(buckets, src.today)} barWidth={t.size.barThin} plotHeight={t.size.chartBarsMini} accessibilityLabel="" mini resetKey="mini" />
        </View>
        <View style={s.line}>
          <Text variant="chip" tone="secondary" style={s.regular}>{`Saldo de ${monthLower(src.thisMonth)}`}</Text>
          <Text variant="chip" tone={net < 0 ? 'danger' : 'success'} numeric style={s.semibold}>
            {signed(net)}
          </Text>
        </View>
      </Pressable>
    </Block>
  );
}

const daysLeft = (today: IsoDate) => {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  return daysInMonth(y, m) - d;
};

/** Hoje: "Mês até agora". Sem contas ainda, não aparece; tocar abre Gráficos no modo Mês. */
export function MonthSoFarBlock() {
  const s = useStyles();
  const src = useChartsSource();
  if (!src || src.data.accounts.length === 0) return null;
  const m = monthSoFar(src.entries, src.data.categories, src.data.budgets, src.today);
  const categories = new Map(src.data.categories.map((c) => [c.id, c]));
  const top = m.top ? sliceName(m.top, categories) : null;
  const left = daysLeft(src.today);
  const budget = m.budget;
  const over = budget !== null && m.spent > budget;
  const closesOver = budget !== null && m.spent + m.planned > budget;
  const aria =
    budget === null
      ? `Mês até agora: ${money(m.spent)} gastos.${top ? ` Maior categoria: ${top}.` : ''} Abrir gráficos do mês.`
      : `Mês até agora: ${money(m.spent)} de ${money(budget)} de orçamento. ${over ? `${money(m.spent - budget)} acima.` : `Restam ${money(budget - m.spent)}.`}${top ? ` Maior categoria: ${top}.` : ''} Abrir gráficos do mês.`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={aria}
      onPress={() => router.push({ pathname: '/financas/graficos', params: { modo: 'mes', mes: src.thisMonth, de: 'Hoje' } })}
      style={({ pressed }) => [s.block, pressed && s.pressed]}
    >
      <Header title="Mês até agora" />
      <BigAmount value={m.spent} after={budget !== null ? `de ${money(budget)}` : undefined} />
      {budget !== null && (
        <>
          <SpendTrack spent={m.spent} planned={m.planned} budget={budget} />
          <View style={s.line}>
            <Text variant="small" tone="secondary" numeric>
              {over ? '' : 'Restam '}
              <Text variant="small" tone={over ? 'danger' : 'primary'} numeric style={s.medium}>
                {money(over ? m.spent - budget : budget - m.spent)}
              </Text>
              {over ? ' acima do orçamento' : ''}
            </Text>
            <Text variant="small" tone="tertiary">
              {left === 1 ? '1 dia restante' : `${left} dias restantes`}
            </Text>
          </View>
          {m.planned > 0 && (
            <Text variant="small" tone="tertiary" numeric>
              {over ? 'Com os previstos, ' : closesOver ? 'Com os previstos, fecha ' : 'Com os previstos, sobram '}
              <Text variant="small" tone={closesOver ? 'danger' : 'primary'} numeric style={s.medium}>
                {over
                  ? `mais ${money(m.planned)}`
                  : closesOver
                    ? `${money(m.spent + m.planned - budget)} acima`
                    : money(budget - m.spent - m.planned)}
              </Text>
            </Text>
          )}
        </>
      )}
      {budget === null && m.planned > 0 && (
        <Text variant="small" tone="tertiary" numeric>{`Mais ${money(m.planned)} previsto até o fim do mês`}</Text>
      )}
      {m.top && top && (
        <View style={[s.line, s.topRow]}>
          <View style={s.grow}>
            <Text variant="caption" tone="tertiary">
              Maior categoria
            </Text>
            <Text style={s.medium}>{top}</Text>
          </View>
          <View style={s.right}>
            <Text variant="caption" tone="tertiary" numeric>{`${sharePct(m.spent > 0 ? m.top.total / m.spent : 0)} do mês`}</Text>
            <Text numeric style={s.medium}>
              {money(m.top.total)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  right: { alignItems: 'flex-end', gap: t.space[0.5] },
  regular: { fontFamily: t.type.body.font },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space[3] },
  link: { flexDirection: 'row', alignItems: 'center', gap: t.space[0.5] },
  press: { gap: t.space[3] },
  pressed: { opacity: t.opacity.pressed },
  block: {
    gap: t.space[3],
    paddingTop: t.layout.blockGap,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  mini: { marginTop: t.space[1] },
  line: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: t.space[3], rowGap: t.space[1] },
  topRow: { alignItems: 'flex-end', marginTop: t.space[1] },
}));

/** Bloco de Hoje: só existe com sessão (o provedor de Finanças tem repositório). */
export function TodayFinanceBlock() {
  return useFinanceMaybe() ? <MonthSoFarBlock /> : null;
}
