// Protótipo "Glife Gráficos", seção 1: período (Mês · 6 meses · 12 meses), Entradas e saídas, Para onde foi,
// Saldo das contas e Patrimônio investido. Entra por Finanças (bloco-resumo e Planejamento) e por Hoje.
import {
  addMonths,
  balanceSeries,
  categoryBreakdown,
  chartPeriod,
  lastDayOf,
  portfolioSeries,
  seriesDates,
  type ChartMode,
  type Month,
} from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Reveal, Screen, SegmentedControl, Text, makeStyles, useTheme } from '@/shared/ui';

import { FlowBlock, LineBlock, WhereBlock } from '../components/charts/ChartBlocks';
import type { CategoryRow } from '../components/charts/CategoryRows';
import { MODE_OPTIONS, dayMonth, monthBounds, monthTitle, periodLabel, signedPct } from '../components/charts/chartFormat';
import { flowBuckets, categoryNames, namesSummary, sliceName } from '../components/charts/slots';
import { balance, signed } from '../components/format';
import { Block, MonthStepper } from '../components/ui';
import { useChartsSource } from '../hooks/useCharts';
import { useInvestments } from '../hooks/useInvestments';

const MODE_PARAM: Record<string, ChartMode> = { mes: 'month', '6m': '6m', '12m': '12m' };
export const modeParam = (m: ChartMode) => (m === 'month' ? 'mes' : m);
const monthOk = (m: unknown): m is Month => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`);

export function ChartsScreen() {
  const s = useStyles();
  const t = useTheme();
  const params = useLocalSearchParams<{ modo?: string; mes?: string; de?: string }>();
  const src = useChartsSource();
  const invest = useInvestments();
  const [mode, setMode] = useState<ChartMode>(MODE_PARAM[params.modo ?? ''] ?? '6m');
  const [picked, setPicked] = useState<Month | null>(monthOk(params.mes) ? params.mes : null);

  const view = useMemo(() => {
    if (!src) return null;
    const bounds = monthBounds(src.first, src.thisMonth);
    const month = picked && picked >= bounds.min && picked <= bounds.max ? picked : src.thisMonth;
    const period = chartPeriod(mode, mode === 'month' ? month : src.thisMonth);
    const categories = new Map(src.data.categories.map((c) => [c.id, c]));
    const slices = categoryBreakdown(src.entries, period.months);
    const rows: CategoryRow[] = slices.map((sl, i) => ({
      key: sl.key,
      name: sliceName(sl, categories),
      sub: sl.categoryIds.length > 1 ? namesSummary(categoryNames(sl.categoryIds, categories)) : undefined,
      total: sl.total,
      share: sl.share,
      top: i === 0 && sl.categoryIds.length === 1,
    }));
    const dates = seriesDates(period, src.today);
    const balancePts = balanceSeries(src.data, src.occurrences, src.today, dates);
    const portfolioPts = invest ? portfolioSeries(invest.assets, invest.movements, src.today, dates) : [];
    const banks = src.data.accounts.filter((a) => a.deleted_at === null && !a.archived && a.kind !== 'credit_card').map((a) => a.name);
    return { bounds, month, period, rows, balancePts, portfolioPts, banks };
  }, [src, invest, mode, picked]);

  if (!src || !view) return <Screen>{null}</Screen>;
  const { bounds, month, period, rows, balancePts, portfolioPts, banks } = view;
  const key = `${mode}-${period.anchor}`;
  const periodText = periodLabel(period);
  const includesToday = period.months.includes(src.thisMonth);
  const lastBalance = balancePts[balancePts.length - 1];
  const first = portfolioPts[0];
  const lastPortfolio = portfolioPts[portfolioPts.length - 1];
  const dv = first && lastPortfolio ? lastPortfolio.value - first.value : 0;

  const openCategory = (categoria: string) =>
    router.push({ pathname: '/financas/grafico/[categoria]', params: { categoria, modo: modeParam(mode), mes: period.anchor } });

  return (
    <Screen>
      <BackHeader title="Gráficos" backLabel={params.de === 'Início' || params.de === 'Hoje' ? 'Início' : 'Finanças'} fallback="/financas" />
      <View style={s.controls}>
        <SegmentedControl label="Período" shape="block" options={MODE_OPTIONS} value={mode} onChange={setMode} />
        <View style={s.periodRow}>
          {mode === 'month' ? (
            <MonthStepper
              label={monthTitle(month)}
              canPrev={month > bounds.min}
              canNext={month < bounds.max}
              onPrev={() => month > bounds.min && setPicked(addMonths(month, -1))}
              onNext={() => month < bounds.max && setPicked(addMonths(month, 1))}
            />
          ) : (
            <Text variant="small" tone="secondary" align="center" numeric style={s.periodText}>
              {periodText}
            </Text>
          )}
        </View>
      </View>
      <Reveal>
        <FlowBlock
          key="flow"
          buckets={flowBuckets(src.entries, period)}
          barWidth={mode === '12m' ? t.size.barThin : mode === '6m' ? t.size.bar : t.size.barWide}
          today={src.today}
          periodText={periodText}
          plannedUntil={includesToday ? dayMonth(lastDayOf(src.thisMonth)) : null}
          resetKey={key}
        />
        <WhereBlock key="where" rows={rows} onOpen={openCategory} />
        <LineBlock
          key="balance"
          title="Saldo das contas"
          right={joinNames(banks)}
          points={balancePts}
          periodText={periodText}
          emptyText="Nenhum movimento nas contas neste período."
          sub={
            lastBalance?.future
              ? { text: `Esperado em ${dayMonth(lastBalance.date)}, com previstos e faturas: ${balance(lastBalance.value)}` }
              : null
          }
          resetKey={key}
        />
        <LineBlock
          key="portfolio"
          title="Patrimônio investido"
          points={portfolioPts}
          periodText={periodText}
          emptyText="Nenhum investimento neste período."
          sub={
            first
              ? {
                  text: `${signed(dv)} · ${signedPct(first.value ? dv / first.value : 0)} no período`,
                  tone: dv < 0 ? 'danger' : dv > 0 ? 'success' : 'tertiary',
                  strong: true,
                }
              : null
          }
          resetKey={key}
        />
        <Block key="end">{null}</Block>
      </Reveal>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  controls: { gap: t.space[2] + t.space[0.5] },
  periodRow: { minHeight: t.touch.minTarget, justifyContent: 'center' },
  periodText: { alignSelf: 'stretch' },
}));
