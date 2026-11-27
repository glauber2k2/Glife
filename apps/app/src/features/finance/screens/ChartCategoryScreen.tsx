// Protótipo "Glife Gráficos", seção 3: uma categoria (ou "Outras") no período — total, comparação com o período
// anterior, orçamento do mês, barras por mês e lançamentos, mais recentes primeiro. Estouro: só o número em vermelho.
import { categoryBreakdown, categoryDetail, chartPeriod, lastDayOf, NO_CATEGORY, OTHER_CATEGORIES, type ChartMode, type ChartEntry, type Month } from '@glife/domain/finance';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { BackHeader, Reveal, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

import { BarChart } from '../components/charts/BarChart';
import { BigAmount, Empty, SpendTrack } from '../components/charts/ChartBlocks';
import { MODE_SHORT, dayMonth, monthLower, monthLong, outflow, periodLabel, previousLabel, signedPct } from '../components/charts/chartFormat';
import { categoryNames, expenseSlots, flowAria, sliceName } from '../components/charts/slots';

import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { Block, BlockHeader } from '../components/ui';
import { useChartsSource } from '../hooks/useCharts';

const MODE_PARAM: Record<string, ChartMode> = { mes: 'month', '6m': '6m', '12m': '12m' };
const monthOk = (m: unknown): m is Month => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function ChartCategoryScreen() {
  const fmt = useMoneyFormat();
  const { money, signed } = fmt;
  const s = useStyles();
  const t = useTheme();
  const params = useLocalSearchParams<{ categoria: string; modo?: string; mes?: string }>();
  const src = useChartsSource();
  const mode = MODE_PARAM[params.modo ?? ''] ?? '6m';

  const view = useMemo(() => {
    if (!src) return null;
    const anchor = monthOk(params.mes) && params.mes <= src.thisMonth ? params.mes : src.thisMonth;
    const period = chartPeriod(mode, anchor);
    const key = params.categoria;
    // "Outras" é o resto do período: as mesmas categorias que a tela Gráficos agrupou.
    const ids =
      key === OTHER_CATEGORIES
        ? (categoryBreakdown(src.entries, period.months).find((x) => x.key === OTHER_CATEGORIES)?.categoryIds ?? [])
        : [key === NO_CATEGORY ? null : key];
    const detail = categoryDetail(src.entries, ids, period, src.data.budgets, src.today);
    const categories = new Map(src.data.categories.map((c) => [c.id, c]));
    const accounts = new Map(src.data.accounts.map((a) => [a.id, a.name]));
    return { period, key, ids, detail, categories, accounts };
  }, [src, mode, params.mes, params.categoria]);

  if (!src || !view) return <Screen>{null}</Screen>;
  const { period, key, ids, detail, categories, accounts } = view;
  const outras = key === OTHER_CATEGORIES;
  const name = sliceName({ key }, categories);
  const periodText = periodLabel(period);
  const prevName = previousLabel(period);
  const cmp =
    detail.previous === null || !prevName
      ? 'Sem dados do período anterior.'
      : detail.previous > 0
        ? `${signed(detail.total - detail.previous)} (${signedPct((detail.total - detail.previous) / detail.previous)}) em relação a ${prevName}`
        : `Sem gastos em ${prevName}.`;
  const b = detail.budget;
  const over = b !== null && b.spent > b.budget;
  const chartCurrent = period.mode === 'month' ? period.anchor : src.thisMonth;
  const resetKey = `${mode}-${period.anchor}-${key}`;

  return (
    <Screen>
      <BackHeader title={name} subtitle={`Categoria · ${MODE_SHORT[mode]}`} backLabel="Gráficos" fallback="/financas" />
      <View style={s.head}>
        {outras && ids.length > 0 && (
          <Text variant="small" tone="tertiary">
            {categoryNames(ids, categories).join(', ')}
          </Text>
        )}
      </View>
      <View style={s.hero}>
        <Text variant="caption" tone="tertiary">
          {`Gasto em ${period.mode === 'month' ? monthLower(period.anchor) : periodText.charAt(0).toLowerCase() + periodText.slice(1)}`}
        </Text>
        <BigAmount value={detail.total} size="big" />
        <Text variant="small" tone="secondary" numeric>
          {cmp}
        </Text>
        {detail.planned > 0 && (
          <Text variant="small" tone="tertiary" numeric>
            {`Mais ${money(detail.planned)} previsto até ${dayMonth(lastDayOf(src.thisMonth))}`}
          </Text>
        )}
      </View>
      <Reveal>
        {b ? (
          <Block key="budget" gap={t.space[3]}>
            <BlockHeader title={`Orçamento de ${monthLower(b.month)}`} />
            <SpendTrack spent={b.spent} planned={b.planned} budget={b.budget} />
            <View style={s.budgetRow}>
              <Text variant="small" tone="secondary" numeric>{`${money(b.spent)} de ${money(b.budget)}`}</Text>
              <Text variant="small" tone="secondary" numeric>
                {over ? '' : 'Restam '}
                <Text variant="small" tone={fmt.toneOf(over ? 'danger' : 'primary', 'primary')} numeric style={s.medium}>
                  {money(over ? b.spent - b.budget : b.budget - b.spent)}
                </Text>
                {over ? ' acima' : ''}
              </Text>
            </View>
          </Block>
        ) : null}
        <Block key="months">
          <BlockHeader title="Por mês" />
          <View style={s.chart}>
            <BarChart
              slots={expenseSlots(detail.byMonth, chartCurrent, fmt)}
              barWidth={mode === '12m' ? t.size.barCategoryThin : t.size.barCategory}
              plotHeight={t.size.chartBarsCategory}
              accessibilityLabel={flowAria(`${name} por mês`, periodText, detail.byMonth, false, fmt)}
              resetKey={resetKey}
            />
          </View>
        </Block>
        <EntryList key="list" entries={detail.entries} outras={outras} categories={categories} accounts={accounts} />
      </Reveal>
    </Screen>
  );
}

/** Lançamentos agrupados por mês; previsto em cinza, com "Previsto" no fim da linha de baixo. */
function EntryList(p: {
  entries: ChartEntry[];
  outras: boolean;
  categories: ReadonlyMap<string, { name: string }>;
  accounts: ReadonlyMap<string, string>;
}) {
  const fmt = useMoneyFormat();
  const s = useStyles();
  if (p.entries.length === 0) {
    return (
      <Block>
        <BlockHeader title="Lançamentos" />
        <Empty>Nenhum lançamento nesta categoria no período.</Empty>
      </Block>
    );
  }
  const groups: { month: Month; items: ChartEntry[] }[] = [];
  for (const e of p.entries) {
    const last = groups[groups.length - 1];
    if (last && last.month === e.month) last.items.push(e);
    else groups.push({ month: e.month, items: [e] });
  }
  const catName = (id: string | null) => (id === null ? 'Sem categoria' : (p.categories.get(id)?.name ?? 'Categoria excluída'));
  return (
    <Block>
      <BlockHeader title="Lançamentos" />
      {groups.map((g) => (
        <View key={g.month}>
          <Text variant="small" tone="secondary" style={[s.semibold, s.monthHeader]}>
            {monthLong(g.month).replace(' de ', ' ')}
          </Text>
          {g.items.map((e) => (
            <View key={e.key} style={s.row}>
              <View style={s.grow}>
                <Text tone={e.planned ? 'tertiary' : 'primary'} style={s.medium}>
                  {e.description || catName(e.category_id)}
                </Text>
                <Text variant="small" tone="tertiary" numeric>
                  {[dayMonth(e.date), p.outras ? catName(e.category_id) : null, p.accounts.get(e.account_id), e.planned ? 'Previsto' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text tone={e.planned ? 'tertiary' : 'primary'} numeric style={s.medium}>
                {outflow(e.amount, fmt)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </Block>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  head: { gap: t.space[2] },
  hero: { gap: t.space[2] },
  chart: { marginTop: t.space[2] },
  budgetRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: t.space[3], rowGap: t.space[1] },
  monthHeader: { paddingTop: t.space[4], paddingBottom: t.space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.listRow,
    paddingVertical: t.space[3],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
}));
