// Blocos do painel de Investimentos (Opção A): alocação com metas, ranking da carteira e do mercado, folhas de metas
// e de leitura da carteira.
import {
  ALLOCATION_GROUPS,
  ALLOCATION_LABELS,
  PORTFOLIO_QUESTIONS,
  allocation,
  portfolioInsight,
  rankBySinceBuy,
  type AllocationGroup,
  type Portfolio,
  type PortfolioQuestion,
  type Targets,
} from '@glife/domain/finance';
import type { MarketItem, MarketType } from '@glife/domain/quotes';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Button, Chip, Input, SegmentedControl, Sheet, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { useMarketRank } from '../hooks/useMarket';
import { Donut } from './charts/Donut';
import { RankBars, type RankRow } from './charts/RankBars';
import { InsightBlocks } from './InsightBlocks';
import { pctSigned, shareText } from './investmentFormat';
import { MARKET_METRICS, MARKET_TYPES_UI, marketQuery, readTargetsForm, targetsToForm, type MarketMetric, type TargetsForm } from './investmentPanel';
import { resultTone } from './investmentRows';

// ---------- Alocação ----------

export function AllocationCard({ portfolio: p, targets, onEditTargets }: { portfolio: Portfolio; targets: Targets | null; onEditTargets: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const { money } = useMoneyFormat();
  const [mode, setMode] = useState<'now' | 'target'>('now');
  const [selected, setSelected] = useState<string | null>(null);
  const slices = allocation(p, targets);
  const showTarget = mode === 'target' && targets !== null;
  const sel = slices.find((x) => x.group === selected) ?? null;
  const center = sel ? (
    <>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {ALLOCATION_LABELS[sel.group]}
      </Text>
      <Text variant="item" numeric numberOfLines={1} style={s.strong}>
        {showTarget ? `${targets![sel.group]}%` : money(sel.total)}
      </Text>
      <Text variant="caption" tone="tertiary" numeric>
        {showTarget ? `atual ${shareText(sel.share)}` : `${shareText(sel.share)} da carteira`}
      </Text>
    </>
  ) : (
    <>
      <Text variant="caption" tone="tertiary">
        {showTarget ? 'Sua meta' : 'Total'}
      </Text>
      <Text variant="item" numeric numberOfLines={1} style={s.strong}>
        {showTarget ? '100%' : money(p.total)}
      </Text>
    </>
  );
  return (
    <View style={s.gap14}>
      <View style={s.head}>
        <Text variant="label" tone="tertiary">
          Alocação por tipo
        </Text>
        <SegmentedControl
          label="Mostrar"
          shape="pill"
          options={[
            { value: 'now', label: 'Atual' },
            { value: 'target', label: 'Meta' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      {mode === 'target' && !targets ? (
        <View style={s.gap8}>
          <Text variant="body" tone="secondary">
            Defina quanto da carteira você quer em cada tipo. O app compara com o que você tem hoje.
          </Text>
          <Button label="Definir metas" variant="secondary" size="md" onPress={onEditTargets} />
        </View>
      ) : (
        <View style={s.alloc}>
          <Donut
            slices={slices.map((x) => ({ key: x.group, value: showTarget ? (targets![x.group] ?? 0) : x.total, color: t.colors.chart[x.group], label: ALLOCATION_LABELS[x.group] }))}
            selected={selected}
            onSelect={setSelected}
            center={center}
            accessibilityLabel={`Alocação ${showTarget ? 'meta' : 'atual'}: ${slices.filter((x) => x.share > 0 || (targets?.[x.group] ?? 0) > 0).map((x) => `${ALLOCATION_LABELS[x.group]} ${showTarget ? `${targets![x.group]}%` : shareText(x.share)}`).join(', ')}`}
          />
          <View style={s.legend}>
            {slices
              .filter((x) => x.total > 0 || (targets?.[x.group] ?? 0) > 0)
              .map((x) => (
                <LegendRow key={x.group} group={x.group} share={x.share} target={targets?.[x.group] ?? null} showTarget={showTarget} dim={selected !== null && selected !== x.group} onPress={() => setSelected(selected === x.group ? null : x.group)} />
              ))}
          </View>
        </View>
      )}
      {mode === 'target' && targets && (
        <Button label="Editar metas" variant="ghost" size="sm" onPress={onEditTargets} />
      )}
    </View>
  );
}

function LegendRow({ group, share, target, showTarget, dim, onPress }: { group: AllocationGroup; share: number; target: number | null; showTarget: boolean; dim: boolean; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const diff = target === null ? null : share * 100 - target;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.legendRow, dim && s.dim]}>
      <View style={[s.swatch, { backgroundColor: t.colors.chart[group] }]} />
      <Text variant="small" style={s.grow} numberOfLines={1}>
        {ALLOCATION_LABELS[group]}
      </Text>
      {showTarget && diff !== null && Math.abs(diff) > 3 ? (
        <Text variant="caption" tone={diff > 0 ? 'warning' : 'accent'} numeric>
          {`${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff))} p.p.`}
        </Text>
      ) : null}
      <Text variant="small" numeric style={s.strong}>
        {showTarget && target !== null ? `${target}%` : shareText(share)}
      </Text>
    </Pressable>
  );
}

export function TargetsSheet({ visible, targets, onClose, onSave }: { visible: boolean; targets: Targets | null; onClose: () => void; onSave: (t: Targets) => Promise<void> }) {
  const s = useStyles();
  const toast = useToast();
  const [form, setForm] = useState<TargetsForm>(() => targetsToForm(targets));
  const [saving, setSaving] = useState(false);
  const [openedWith, setOpenedWith] = useState<boolean>(visible);
  if (visible !== openedWith) {
    setOpenedWith(visible);
    if (visible) setForm(targetsToForm(targets));
  }
  const { sum, targets: valid } = readTargetsForm(form);
  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(valid);
      toast({ message: 'Metas salvas' });
      onClose();
    } catch (e) {
      toast({ message: `Metas não salvas: ${errorText(e)}` });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Metas por tipo" subtitle="Quanto da carteira você quer em cada tipo, em %.">
      <View style={s.grid}>
        {ALLOCATION_GROUPS.map((g) => (
          <View key={g} style={s.cell}>
            <Input label={ALLOCATION_LABELS[g]} value={form[g]} keyboardType="number-pad" maxLength={3} onChangeText={(v) => setForm((f) => ({ ...f, [g]: v.replace(/\D/g, '') }))} />
          </View>
        ))}
      </View>
      <Text variant="small" tone={sum === 100 ? 'success' : 'warning'} numeric style={s.sum}>
        {sum === 100 ? 'Soma: 100%' : `Soma: ${sum}% · precisa dar 100%`}
      </Text>
      <Button label="Salvar metas" fullWidth haptic disabled={!valid} loading={saving} onPress={() => void save()} />
    </Sheet>
  );
}

// ---------- Ranking ----------

export function RankingCard({ portfolio: p, onOpenAsset, onOpenMarket }: { portfolio: Portfolio; onOpenAsset: (id: string) => void; onOpenMarket: (item: MarketItem) => void }) {
  const s = useStyles();
  const { signed, toneOf } = useMoneyFormat();
  const [scope, setScope] = useState<'mine' | 'market'>('mine');
  const mine: RankRow[] = useMemo(
    () =>
      rankBySinceBuy(p).map((r) => ({
        key: r.asset.id,
        title: r.asset.name,
        subtitle: signed(r.result),
        value: r.pct,
        label: pctSigned(r.pct),
        tone: toneOf(resultTone(r.result), 'tertiary'),
      })),
    [p, signed, toneOf],
  );
  return (
    <View style={s.gap14}>
      <View style={s.head}>
        <Text variant="label" tone="tertiary">
          Ranking
        </Text>
        <SegmentedControl
          label="Ranking de"
          shape="pill"
          options={[
            { value: 'mine', label: 'Minha carteira' },
            { value: 'market', label: 'Mercado' },
          ]}
          value={scope}
          onChange={setScope}
        />
      </View>
      {scope === 'mine' ? (
        <>
          <Text variant="caption" tone="tertiary">
            Quanto cada ativo rendeu desde que você comprou
          </Text>
          <RankBars rows={mine} diverging numbered onPress={onOpenAsset} />
        </>
      ) : (
        <MarketRanking onOpen={onOpenMarket} />
      )}
    </View>
  );
}

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

function MarketRanking({ onOpen }: { onOpen: (item: MarketItem) => void }) {
  const s = useStyles();
  const [metric, setMetric] = useState<MarketMetric>('up_day');
  const [type, setType] = useState<MarketType>('stock');
  const q = marketQuery(metric, type);
  const { items, status } = useMarketRank(q.source, q.sort, q.type);
  const value = (m: MarketItem) => (metric === 'volume' ? (m.volume ?? 0) : metric === 'up_30d' ? (m.change30d ?? 0) : metric === 'up_1y' ? (m.change1y ?? 0) : (m.changeDay ?? 0));
  const rows: RankRow[] = items.map((m) => ({
    key: `${m.source}:${m.symbol}`,
    title: m.ticker,
    subtitle: m.name,
    value: value(m),
    label: metric === 'volume' ? compact.format(value(m)) : pctSigned(value(m) / 100),
    tone: metric === 'volume' ? 'primary' : value(m) < 0 ? 'danger' : 'success',
  }));
  const cryptoOnly = metric === 'up_30d' || metric === 'up_1y';
  return (
    <View style={s.gap12}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {MARKET_METRICS.map((m) => (
          <Chip key={m.value} label={m.label} size="sm" selected={metric === m.value} onPress={() => setMetric(m.value)} />
        ))}
      </ScrollView>
      {!cryptoOnly && (
        <View style={s.chipsWrap}>
          {MARKET_TYPES_UI.map((m) => (
            <Chip key={m.value} label={m.label} size="sm" selected={type === m.value} onPress={() => setType(m.value)} />
          ))}
        </View>
      )}
      {status === 'loading' ? (
        <Text variant="small" tone="tertiary">
          Buscando o mercado…
        </Text>
      ) : status === 'offline' ? (
        <Text variant="small" tone="tertiary">
          Sem conexão: o ranking do mercado volta quando a internet voltar.
        </Text>
      ) : status === 'empty' ? (
        <Text variant="small" tone="tertiary">
          A lista do mercado não está disponível agora.
        </Text>
      ) : (
        <RankBars rows={rows} numbered onPress={(key) => onOpen(items.find((m) => `${m.source}:${m.symbol}` === key)!)} />
      )}
      <Text variant="caption" tone="tertiary">
        Dados do período, com atraso de até 30 min. Ranking não é recomendação.
      </Text>
    </View>
  );
}

// ---------- Leitura da carteira ----------

export function PortfolioQuestions({ onAsk }: { onAsk: (q: PortfolioQuestion, label: string) => void }) {
  const s = useStyles();
  return (
    <View style={s.chipsWrap}>
      {PORTFOLIO_QUESTIONS.map(([q, label]) => (
        <Chip key={q} label={label} size="sm" onPress={() => onAsk(q, label)} />
      ))}
    </View>
  );
}

export function InsightSheet({ question, portfolio, targets, onClose }: { question: { q: PortfolioQuestion; label: string } | null; portfolio: Portfolio; targets: Targets | null; onClose: () => void }) {
  const { money } = useMoneyFormat();
  const blocks = question ? portfolioInsight(question.q, { portfolio, targets, money }) : [];
  return (
    <Sheet visible={question !== null} onClose={onClose} title={question?.label}>
      <InsightBlocks blocks={blocks} />
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  gap8: { gap: t.space[2] },
  gap12: { gap: t.space[3] },
  gap14: { gap: t.space[3.5] },
  strong: { fontFamily: t.type.button.font },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: t.space[2] },
  alloc: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: t.space[4] },
  legend: { flex: 1, minWidth: t.size.donut, gap: t.space[0.5] },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.touch.minTarget - t.space[2], paddingVertical: t.space[1] },
  grow: { flex: 1, minWidth: 0 },
  dim: { opacity: t.opacity.faint },
  swatch: { width: t.space[2.5], height: t.space[2.5], borderRadius: t.space[0.5] + 1 },
  chips: { gap: t.space[2], paddingRight: t.space[2] },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -t.space[1.5] },
  cell: { width: '50%', paddingHorizontal: t.space[1.5], paddingBottom: t.space[3] },
  sum: { marginBottom: t.space[3] },
}));
