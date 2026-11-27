// Entradas para Gráficos: o bloco-resumo "Últimos 6 meses" em Finanças (miniatura das barras, sem toque) e
// "Mês até agora" em Hoje (gasto × orçamento, como o mês fecha com os previstos e a maior categoria).
import { daysInMonth, monthBuckets, monthSoFar, chartPeriod, type IsoDate } from '@glife/domain/finance';
import { router } from 'expo-router';
import { ChevronRight, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card, Icon, ProgressBar, SectionHeader, Tag, Text, makeStyles, useTheme } from '@/shared/ui';


import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { MoneyEyeButton } from '../MoneyEyeButton';
import { Block } from '../ui';
import { useFinanceMaybe } from '../../hooks/FinanceData';
import { useChartsSource } from '../../hooks/useCharts';
import { BarChart } from './BarChart';
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
  const fmt = useMoneyFormat();
  const { signed } = fmt;
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
        accessibilityLabel={`${flowAria('Últimos 6 meses de entradas e saídas', 'Últimos 6 meses', buckets, true, fmt)} Saldo de ${monthLower(src.thisMonth)} ${signed(net)}. Abrir gráficos.`}
        onPress={() => router.push({ pathname: '/financas/graficos', params: { modo: '6m', de: 'Finanças' } })}
        style={({ pressed }) => [s.press, pressed && s.pressed]}
      >
        <Header title="Últimos 6 meses" />
        <View style={s.mini} pointerEvents="none">
          <BarChart slots={flowSlots(buckets, src.today, fmt)} barWidth={t.size.barThin} plotHeight={t.size.chartBarsMini} accessibilityLabel="" mini resetKey="mini" />
        </View>
        <View style={s.line}>
          <Text variant="chip" tone="secondary" style={s.regular}>{`Saldo de ${monthLower(src.thisMonth)}`}</Text>
          <Text variant="chip" tone={fmt.toneOf(net < 0 ? 'danger' : 'success', 'tertiary')} numeric style={s.semibold}>
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

/** Início: "Mês até agora". Sem contas ainda, não aparece; tocar abre Finanças, o link abre Gráficos do mês. */
export function MonthSoFarBlock() {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
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
      ? `Mês até agora: ${money(m.spent)} gastos.${top ? ` Maior categoria: ${top}.` : ''} Abrir Finanças.`
      : `Mês até agora: ${money(m.spent)} de ${money(budget)} de orçamento. ${over ? `${money(m.spent - budget)} acima.` : `Restam ${money(budget - m.spent)}.`}${top ? ` Maior categoria: ${top}.` : ''} Abrir Finanças.`;
  return (
    <View style={s.section}>
      <SectionHeader
        title="Mês até agora"
        accessory={<MoneyEyeButton />}
        actionLabel="Gráficos"
        onAction={() => router.push({ pathname: '/financas/graficos', params: { modo: 'mes', mes: src.thisMonth, de: 'Início' } })}
      />
      <Card onPress={() => router.navigate('/financas')} accessibilityLabel={aria} gap={t.space[3.5]}>
        <View style={s.line}>
          <View style={s.grow}>
            <Text variant="small" tone="tertiary">{`Gasto em ${monthLower(src.thisMonth)}`}</Text>
            <Text variant="big" numeric style={s.amount}>
              {money(m.spent)}
            </Text>
          </View>
          <View style={s.right}>
            {budget !== null && (
              <Text variant="small" tone="tertiary" numeric align="right">{`de ${money(budget)}`}</Text>
            )}
            <Text variant="small" tone="secondary" align="right" style={s.medium}>
              {left === 0 ? 'último dia' : left === 1 ? 'falta 1 dia' : `faltam ${left} dias`}
            </Text>
          </View>
        </View>
        {budget !== null && (
          <ProgressBar
            value={budget > 0 ? m.spent / budget : 1}
            planned={budget > 0 ? m.planned / budget : 0}
            tone={over ? 'danger' : 'neutral'}
            thickness="thick"
            label={`${sharePct(budget > 0 ? m.spent / budget : 1)} do orçamento usado`}
          />
        )}
        <View style={s.tags}>
          {over && budget !== null && <Tag tone="danger" icon={TriangleAlert} label={`Passou ${money(m.spent - budget)}`} />}
          {!over && closesOver && budget !== null && <Tag tone="warning" label={`Com os previstos, fecha ${money(m.spent + m.planned - budget)} acima`} />}
          {m.planned > 0 && <Tag label={`${money(m.planned)} previstos`} />}
          {m.top && top && <Tag tone="outline" label={`Maior: ${top} · ${sharePct(m.spent > 0 ? m.top.total / m.spent : 0)}`} />}
        </View>
      </Card>
    </View>
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
  section: { gap: t.space[3] },
  amount: { fontSize: t.type.title.fontSize + t.space[0.5], lineHeight: t.type.title.lineHeight + t.space[0.5] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));

/** Bloco de Hoje: só existe com sessão (o provedor de Finanças tem repositório). */
export function TodayFinanceBlock() {
  return useFinanceMaybe() ? <MonthSoFarBlock /> : null;
}
