// Investimentos (Opção A, painel): patrimônio com resultado desde o início, gráfico de evolução (Patrimônio ×
// Investido, toque/arraste), alocação por tipo com metas, ranking da carteira e do mercado, leitura dos números e a
// lista de ativos com mini gráfico. Encerrados ficam recolhidos no fim. Ao abrir, pede as cotações vencidas.
import {
  isAutoQuoted,
  portfolio,
  portfolioDaily,
  portfolioHeadline,
  quoteSourceOf,
  slicePeriod,
  type Period,
  type PortfolioQuestion,
  type PositionedAsset,
} from '@glife/domain/finance';
import { keyOf, type MarketItem } from '@glife/domain/quotes';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AIInsight, BackHeader, Card, Chip, EmptyState, IconButton, ListGroup, Reveal, Screen, SegmentedControl, Tag, Text, makeStyles, useTheme } from '@/shared/ui';

import { InvestLineChart } from '../components/charts/InvestLineChart';
import { Sparkline } from '../components/charts/Sparkline';
import { dm, dmy, todayIso } from '../components/format';
import { AllocationCard, InsightSheet, PortfolioQuestions, RankingCard, TargetsSheet } from '../components/investmentCards';
import { pctSigned } from '../components/investmentFormat';
import { ASSET_SORTS, sortAssets, type AssetSort } from '../components/investmentPanel';
import { AssetRow, ClosedToggle, resultTone } from '../components/investmentRows';
import { useCountUp } from '../components/ui';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { useInvestments, useRefreshQuotes } from '../hooks/useInvestments';
import { usePriceBook, useTargets } from '../hooks/useMarket';

const openAsset = (id: string) => router.push({ pathname: '/financas/investimento/[id]', params: { id } });
const PERIODS: readonly { value: Period; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '6M', label: '6M' },
  { value: '1A', label: '1A' },
  { value: 'Tudo', label: 'Tudo' },
];
const SPARK_DAYS = 90;

function subOf({ asset, position }: PositionedAsset, closed: boolean, notFound: ReadonlySet<string>): string {
  const parts = [asset.institution];
  const source = quoteSourceOf(asset.kind);
  if (closed && position.lastDate) parts.push(`encerrado em ${dmy(position.lastDate)}`);
  else if (source && asset.quote_symbol && notFound.has(keyOf({ source, symbol: asset.quote_symbol }))) parts.push('código não encontrado');
  else if (isAutoQuoted(asset.kind) && !position.hasPrice) parts.push('sem cotação');
  return parts.filter(Boolean).join(' · ');
}

export function InvestmentsScreen() {
  const { money, signed, balance, toneOf, hidden } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const today = todayIso();
  const snap = useInvestments();
  const { notFound } = useRefreshQuotes(snap);
  const { book } = usePriceBook(snap?.assets ?? null);
  const { save: saveTargets } = useTargets(snap?.targets ?? null);
  const [closedOpen, setClosedOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('1A');
  const [sort, setSort] = useState<AssetSort>('value');
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [question, setQuestion] = useState<{ q: PortfolioQuestion; label: string } | null>(null);
  const p = useMemo(() => (snap ? portfolio(snap.assets, snap.movements, today) : null), [snap, today]);
  const daily = useMemo(() => (p && snap ? slicePeriod(portfolioDaily(p, snap.movements, book, today), period, today) : []), [p, snap, book, today, period]);
  const total = useCountUp(p?.total ?? 0);
  const newAsset = () => router.push('/financas/investimento/novo');
  const open = useMemo(() => (p ? sortAssets(p.groups.flatMap((g) => g.assets), sort) : []), [p, sort]);
  const headline = p && snap ? portfolioHeadline(p, snap.targets) : null;
  const income = useMemo(() => (p ? p.groups.flatMap((g) => g.assets).reduce((sum, x) => sum + x.position.income, 0) : 0), [p]);
  const openMarket = (m: MarketItem) => {
    const mine = snap?.assets.find((a) => a.quote_symbol === m.symbol && quoteSourceOf(a.kind) === m.source);
    if (mine) openAsset(mine.id);
    else router.push({ pathname: '/financas/investimento/novo', params: { symbol: m.symbol, source: m.source } });
  };

  return (
    <Screen>
      <BackHeader title="Investimentos" fallback="/financas" right={<IconButton icon={Plus} label="Novo ativo" onPress={newAsset} />} />

      {p && snap && snap.assets.length === 0 ? (
        <EmptyState
          title="Nenhum investimento ainda"
          message="Cadastre um ativo e lance aportes e resgates. Ações, FIIs e cripto atualizam sozinhos."
          actionLabel="Novo ativo"
          onAction={newAsset}
        />
      ) : p && snap ? (
        <Reveal>
          <View style={s.hero}>
            <Text variant="small" tone="tertiary">
              Patrimônio investido
            </Text>
            <Text variant="big" numeric accessibilityLabel={`Patrimônio investido ${money(p.total)}`}>
              {balance(total)}
            </Text>
            <View style={s.tagLine}>
              <Tag large tone={hidden ? 'neutral' : p.result < 0 ? 'danger' : 'success'} label={`${signed(p.result)} · ${pctSigned(p.pct)} desde o início`} />
            </View>
            <Text variant="caption" tone="tertiary" numeric>
              {[`Investido ${money(p.invested)}`, income > 0 ? `inclui ${money(income)} em rendimentos` : '', p.updated ? `atualizado em ${dm(p.updated)}` : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>

          {daily.length > 1 && (
            <Card>
              <View style={s.chartHead}>
                <View style={s.legend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendLine, { backgroundColor: t.colors.accent }]} />
                    <Text variant="caption" tone="secondary">
                      Patrimônio
                    </Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={s.legendDash} />
                    <Text variant="caption" tone="secondary">
                      Investido
                    </Text>
                  </View>
                </View>
                <SegmentedControl label="Período" shape="pill" options={PERIODS} value={period} onChange={setPeriod} />
              </View>
              <InvestLineChart
                series={[
                  { values: daily.map((d) => d.value), color: t.colors.accent, area: true, label: 'Patrimônio' },
                  { values: daily.map((d) => d.invested), color: t.colors.textTertiary, dashed: true, label: 'Investido' },
                ]}
                dates={daily.map((d) => d.date)}
                format={balance}
                resetKey={`${period}:${daily.length}`}
                accessibilityLabel={`Patrimônio de ${money(daily[0]!.value)} para ${money(daily.at(-1)!.value)} no período; investido ${money(daily.at(-1)!.invested)}`}
              />
            </Card>
          )}

          <Card>
            <AllocationCard portfolio={p} targets={snap.targets} onEditTargets={() => setTargetsOpen(true)} />
          </Card>

          <Card>
            <RankingCard portfolio={p} onOpenAsset={openAsset} onOpenMarket={openMarket} />
          </Card>

          <View style={s.reading}>
            {headline && <AIInsight text={headline} actionLabel="Ver como equilibrar" onAction={() => setQuestion({ q: 'concentracao', label: 'Estou concentrado em algo?' })} />}
            <Text variant="label" tone="tertiary">
              Leitura dos números
            </Text>
            <PortfolioQuestions onAsk={(q, label) => setQuestion({ q, label })} />
          </View>

          <View style={s.group}>
            <View style={s.listHead}>
              <Text variant="label" tone="tertiary">
                Seus ativos
              </Text>
              <View style={s.sorts}>
                {ASSET_SORTS.map((o) => (
                  <Chip key={o.value} label={o.label} size="sm" selected={sort === o.value} onPress={() => setSort(o.value)} />
                ))}
              </View>
            </View>
            <ListGroup>
              {open.map((x) => {
                const pts = book.get(x.asset.id)?.slice(-SPARK_DAYS) ?? [];
                return (
                  <AssetRow
                    key={x.asset.id}
                    name={x.asset.name}
                    sub={subOf(x, false, notFound)}
                    value={money(x.position.current)}
                    pct={pctSigned(x.position.pct)}
                    pctTone={toneOf(resultTone(x.position.result), 'tertiary')}
                    spark={pts.length > 1 ? <Sparkline values={pts.map((q) => q.closeE8)} tone={x.position.result < 0 ? 'bad' : 'ok'} /> : undefined}
                    onPress={() => openAsset(x.asset.id)}
                  />
                );
              })}
            </ListGroup>
            {p.closed.length > 0 && (
              <>
                <ClosedToggle count={p.closed.length} open={closedOpen} onPress={() => setClosedOpen((o) => !o)} />
                {closedOpen && (
                  <ListGroup>
                    {p.closed.map((x) => (
                      <AssetRow
                        key={x.asset.id}
                        closed
                        name={x.asset.name}
                        sub={subOf(x, true, notFound)}
                        value={money(0)}
                        pct={signed(x.position.result)}
                        pctTone={toneOf(resultTone(x.position.result), 'tertiary')}
                        onPress={() => openAsset(x.asset.id)}
                      />
                    ))}
                  </ListGroup>
                )}
              </>
            )}
          </View>

          <TargetsSheet visible={targetsOpen} targets={snap.targets} onClose={() => setTargetsOpen(false)} onSave={saveTargets} />
          <InsightSheet question={question} portfolio={p} targets={snap.targets} onClose={() => setQuestion(null)} />
        </Reveal>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { gap: t.space[1.5] },
  tagLine: { flexDirection: 'row' },
  chartHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2], marginBottom: t.space[2] },
  legend: { flexDirection: 'row', gap: t.space[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  legendLine: { width: t.space[3.5], height: t.size.ring, borderRadius: t.size.ring },
  legendDash: { width: t.space[3.5], height: 0, borderTopWidth: t.size.ring, borderStyle: 'dashed', borderColor: t.colors.textTertiary },
  reading: { gap: t.space[3] },
  group: { gap: t.space[3] },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: t.space[2] },
  sorts: { flexDirection: 'row', gap: t.space[1.5] },
}));
