// Blocos da tela Gráficos (Entradas e saídas, Para onde foi, linhas no tempo) e peças comuns: valor grande que
// conta, legenda e a barra de orçamento de 3 px (realizado + previsto; estourou → enche, sem mudar de cor).
import { formatBRL, flowTotals, type FlowBucket, type SeriesPoint } from '@glife/domain/finance';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text, makeStyles, useTheme, type TextTone } from '@/shared/ui';

import { balance, money, signed } from '../format';
import { Block, BlockHeader, useCountUp } from '../ui';
import { BarChart } from './BarChart';
import { CategoryRows, type CategoryRow } from './CategoryRows';
import { dayMonth, outflow } from './chartFormat';
import { LineChart } from './LineChart';
import { flowAria, flowSlots } from './slots';

// ---------- Peças ----------

/** "R$ 1.450,00" grande, contando até o novo valor; `size` escolhe a escala (28 nos blocos, 40/44 no topo). */
export function BigAmount({ value, size = 'title2', after }: { value: number; size?: 'title2' | 'display'; after?: string }) {
  const s = useStyles();
  const shown = useCountUp(value);
  return (
    <View style={s.amount}>
      <Text variant={size === 'display' ? 'heading' : 'item'} tone="secondary" style={s.light}>
        {value < 0 ? '− R$' : 'R$'}
      </Text>
      <Text variant={size} numeric>
        {formatBRL(Math.abs(shown), { symbol: false })}
      </Text>
      {after ? (
        <Text variant="small" tone="tertiary">
          {after}
        </Text>
      ) : null}
    </View>
  );
}

/** Linha da legenda: quadradinho (contorno, cheio, previsto ou nada), nome e valor à direita. */
export function LegendRow(p: { swatch?: 'outline' | 'fill' | 'planned'; label: string; value: string; tone?: TextTone; strong?: boolean; muted?: boolean }) {
  const s = useStyles();
  return (
    <View style={s.legendRow}>
      <View style={[s.swatch, p.swatch === 'outline' && s.swatchOutline, p.swatch === 'fill' && s.swatchFill, p.swatch === 'planned' && s.swatchPlanned]} />
      <Text variant={p.muted ? 'small' : 'chip'} tone={p.muted ? 'tertiary' : 'secondary'} style={[s.grow, s.regular]}>
        {p.label}
      </Text>
      <Text variant={p.muted ? 'small' : 'chip'} tone={p.tone ?? (p.muted ? 'tertiary' : 'primary')} numeric style={p.strong ? s.semibold : p.muted ? undefined : s.medium}>
        {p.value}
      </Text>
    </View>
  );
}

/** Barra de 3 px do orçamento: realizado em cinza médio e previsto em cinza claro logo depois. */
export function SpendTrack({ spent, planned, budget }: { spent: number; planned: number; budget: number }) {
  const s = useStyles();
  const rw = budget > 0 ? Math.min(1, Math.max(0, spent / budget)) : 0;
  const pw = budget > 0 ? Math.min(Math.max(0, planned / budget), 1 - rw) : 0;
  return (
    <View style={s.track}>
      <View style={[s.trackSpent, { flex: rw }]} />
      <View style={[s.trackPlanned, { flex: pw }]} />
      <View style={{ flex: 1 - rw - pw }} />
    </View>
  );
}

export const Empty = ({ children }: { children: string }) => {
  const s = useStyles();
  return (
    <Text tone="tertiary" style={s.empty}>
      {children}
    </Text>
  );
};

// ---------- Entradas e saídas ----------

export function FlowBlock(p: { buckets: FlowBucket[]; barWidth: number; today: string; periodText: string; plannedUntil: string | null; resetKey: string }) {
  const s = useStyles();
  const t = useTheme();
  const totals = flowTotals(p.buckets);
  const has = p.buckets.some((b) => b.income.confirmed + b.income.planned + b.expense.confirmed + b.expense.planned !== 0);
  const net = totals.income.confirmed - totals.expense.confirmed;
  const planned = totals.income.planned + totals.expense.planned > 0;
  return (
    <Block>
      <BlockHeader title="Entradas e saídas" />
      {has ? (
        <>
          <View style={s.chart}>
            <BarChart
              slots={flowSlots(p.buckets, p.today)}
              barWidth={p.barWidth}
              plotHeight={t.size.chartBars}
              accessibilityLabel={flowAria('Entradas e saídas', p.periodText, p.buckets, true)}
              resetKey={p.resetKey}
            />
          </View>
          <View style={s.legend}>
            <LegendRow swatch="outline" label="Entradas" value={money(totals.income.confirmed)} />
            <LegendRow swatch="fill" label="Saídas" value={outflow(totals.expense.confirmed)} />
            <LegendRow label="Saldo do período" value={signed(net)} tone={net < 0 ? 'danger' : 'success'} strong />
            {planned && p.plannedUntil && (
              <LegendRow
                swatch="planned"
                muted
                label={`Previsto até ${p.plannedUntil}`}
                value={`${signed(totals.income.planned)}  ·  ${outflow(totals.expense.planned)}`}
              />
            )}
          </View>
        </>
      ) : (
        <Empty>Nenhum lançamento neste período.</Empty>
      )}
    </Block>
  );
}

// ---------- Para onde foi ----------

export function WhereBlock({ rows, onOpen }: { rows: CategoryRow[]; onOpen: (key: string) => void }) {
  const total = rows.reduce((a, r) => a + r.total, 0);
  return (
    <Block>
      <BlockHeader title="Para onde foi" right={total > 0 ? money(total) : undefined} />
      {rows.length > 0 ? <CategoryRows rows={rows} onOpen={onOpen} /> : <Empty>Nenhum gasto neste período.</Empty>}
    </Block>
  );
}

// ---------- Linhas no tempo ----------

/** Descrição da linha para o leitor de tela: de, até hoje, esperado, mínimo e máximo. */
export function lineAria(chart: string, periodText: string, pts: readonly SeriesPoint[]): string {
  const when = (p: SeriesPoint) => (p.today ? 'hoje' : `em ${dayMonth(p.date)}`);
  const real = pts.filter((p) => !p.future);
  const lastReal = real[real.length - 1] ?? pts[0]!;
  const last = pts[pts.length - 1]!;
  const min = pts.reduce((a, b) => (b.value < a.value ? b : a));
  const max = pts.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    `${chart}, ${periodText.charAt(0).toLowerCase()}${periodText.slice(1)}. De ${balance(pts[0]!.value)} ${when(pts[0]!)} a ` +
    `${balance(lastReal.value)} ${when(lastReal)}${last.future ? `; esperado ${balance(last.value)} em ${dayMonth(last.date)}` : ''}. ` +
    `Mínimo ${balance(min.value)} ${when(min)}, máximo ${balance(max.value)} ${when(max)}.`
  );
}

export function LineBlock(p: {
  title: string;
  right?: string;
  points: SeriesPoint[];
  periodText: string;
  emptyText: string;
  /** linha abaixo do valor (esperado; variação no período) */
  sub?: { text: string; tone?: TextTone; strong?: boolean } | null;
  resetKey: string;
  children?: ReactNode;
}) {
  const s = useStyles();
  const real = p.points.filter((x) => !x.future);
  const now = real.find((x) => x.today) ?? real[real.length - 1];
  return (
    <Block>
      <BlockHeader title={p.title} right={p.right} />
      {p.points.length > 1 && now ? (
        <>
          <View style={s.lineHero}>
            <BigAmount value={now.value} after={now.today ? 'hoje' : `em ${dayMonth(now.date)}`} />
            {p.sub ? (
              <Text variant="caption" tone={p.sub.tone ?? 'tertiary'} numeric style={p.sub.strong ? s.medium : undefined}>
                {p.sub.text}
              </Text>
            ) : null}
          </View>
          <LineChart points={p.points} accessibilityLabel={lineAria(p.title, p.periodText, p.points)} resetKey={p.resetKey} />
        </>
      ) : (
        <Empty>{p.emptyText}</Empty>
      )}
    </Block>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0 },
  regular: { fontFamily: t.type.body.font },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  light: { fontFamily: t.type.title.font },
  amount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: t.space[2], rowGap: t.space[1] },
  chart: { marginTop: t.space[2] },
  legend: { gap: t.space[2] + t.space[0.5], marginTop: t.layout.blockGap },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] + t.space[0.5] },
  swatch: { width: t.size.legendSwatch, height: t.size.legendSwatch, borderRadius: t.size.barRadius },
  swatchOutline: { borderWidth: t.size.barOutline, borderColor: t.colors.textTertiary },
  swatchFill: { backgroundColor: t.colors.textSecondary },
  swatchPlanned: { backgroundColor: t.colors.planned },
  track: { height: t.size.track, borderRadius: t.radius.full, backgroundColor: t.colors.soft, flexDirection: 'row', overflow: 'hidden' },
  trackSpent: { backgroundColor: t.colors.textSecondary },
  trackPlanned: { backgroundColor: t.colors.planned },
  empty: { paddingTop: t.space[3] },
  lineHero: { gap: t.space[1], marginTop: t.space[2] },
}));
