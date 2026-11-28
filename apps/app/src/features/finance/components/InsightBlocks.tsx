// Mostra uma "leitura dos números" (blocos do domain) em cascata: texto, títulos, listas a favor/atenção, números,
// faixa do passado, barra de alocação antes/depois e o aviso final.
import { ALLOCATION_GROUPS, ALLOCATION_LABELS, type InsightBlock } from '@glife/domain/finance';
import { CircleCheck, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon, Reveal, Text, makeStyles, useTheme } from '@/shared/ui';

const pct = (v: number) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function InsightBlocks({ blocks }: { blocks: readonly InsightBlock[] }) {
  const s = useStyles();
  return (
    <Reveal>
      {blocks.map((b, i) => (
        <View key={i} style={s.block}>
          <Block b={b} />
        </View>
      ))}
    </Reveal>
  );
}

function Block({ b }: { b: InsightBlock }) {
  const s = useStyles();
  const t = useTheme();
  switch (b.kind) {
    case 'text':
      return <Text variant="body">{b.text}</Text>;
    case 'heading':
      return (
        <Text variant="label" tone="tertiary">
          {b.text}
        </Text>
      );
    case 'list':
      return (
        <View style={s.list}>
          {b.items.map((item) => (
            <View key={item} style={s.li}>
              <Icon icon={b.tone === 'ok' ? CircleCheck : TriangleAlert} size={t.icon.small} color={b.tone === 'ok' ? 'success' : 'warning'} />
              <Text variant="body" style={s.grow}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'numbers':
      return (
        <View style={s.numbers}>
          {b.items.map((n) => (
            <View key={n.label} style={s.number}>
              <Text variant="caption" tone="tertiary">
                {n.label}
              </Text>
              <Text variant="item" numeric tone={n.tone === 'bad' ? 'danger' : n.tone === 'ok' ? 'success' : 'primary'} style={s.strong}>
                {n.value}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'range': {
      const min = Math.min(b.low, 0) - 2;
      const max = Math.max(b.high, 0) + 2;
      const x = (v: number) => `${((v - min) / (max - min)) * 100}%` as const;
      return (
        <View style={s.range}>
          <View style={s.rangeTrack}>
            <View style={[s.rangeBand, { left: x(b.low), width: `${((b.high - b.low) / (max - min)) * 100}%` }]} />
            <View style={[s.rangeZero, { left: x(0) }]} />
            <View style={[s.rangeMid, { left: x(b.mid) }]} />
          </View>
          <View style={s.rangeLabels}>
            <Text variant="micro" tone="tertiary" numeric>
              {pct(b.low)}
            </Text>
            <Text variant="micro" tone="tertiary" numeric>
              0%
            </Text>
            <Text variant="micro" tone="tertiary" numeric>
              {pct(b.high)}
            </Text>
          </View>
          <Text variant="small" tone="secondary">
            {b.caption}
          </Text>
        </View>
      );
    }
    case 'allocation':
      return (
        <View style={s.alloc}>
          <StackBar label={b.after ? 'Hoje' : 'Atual'} shares={b.before} />
          {b.after && <StackBar label="Depois do aporte" shares={b.after} />}
          {b.targets && <StackBar label="Sua meta" shares={b.targets} />}
          <View style={s.legend}>
            {ALLOCATION_GROUPS.filter((g) => b.before[g] > 0.5 || (b.targets?.[g] ?? 0) > 0).map((g) => (
              <View key={g} style={s.legendItem}>
                <View style={[s.swatch, { backgroundColor: t.colors.chart[g] }]} />
                <Text variant="caption" tone="secondary" numeric>
                  {`${ALLOCATION_LABELS[g]} ${Math.round(b.before[g])}%${b.after && g === b.focus ? ` → ${Math.round(b.after[g])}%` : ''}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    case 'disclaimer':
      return (
        <Text variant="caption" tone="tertiary" style={s.disclaimer}>
          {b.text}
        </Text>
      );
  }
}

function StackBar({ label, shares }: { label: string; shares: Record<(typeof ALLOCATION_GROUPS)[number], number> }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.stackWrap}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <View style={s.stack} accessible accessibilityLabel={`${label}: ${ALLOCATION_GROUPS.filter((g) => shares[g] > 0.5).map((g) => `${ALLOCATION_LABELS[g]} ${Math.round(shares[g])}%`).join(', ')}`}>
        {ALLOCATION_GROUPS.filter((g) => shares[g] > 0.2).map((g) => (
          <View key={g} style={{ flexGrow: shares[g], backgroundColor: t.colors.chart[g] }} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { marginBottom: t.space[3] },
  grow: { flex: 1, minWidth: 0 },
  strong: { fontFamily: t.type.button.font },
  list: { gap: t.space[2] },
  li: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[2], paddingTop: t.space[0.5] },
  numbers: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.space[3] },
  number: { width: '50%', paddingRight: t.space[2], gap: t.space[0.5] },
  range: { gap: t.space[1.5] },
  rangeTrack: { height: t.size.rankTrack * 2.8, justifyContent: 'center' },
  rangeBand: { position: 'absolute', height: t.size.rankTrack * 1.6, borderRadius: t.radius.full, backgroundColor: t.colors.accentSoft },
  rangeZero: { position: 'absolute', top: 0, bottom: 0, width: t.hairline, backgroundColor: t.colors.textTertiary },
  rangeMid: {
    position: 'absolute',
    width: t.size.rankTrack * 1.2,
    height: t.size.rankTrack * 1.2,
    marginLeft: -t.size.rankTrack * 0.6,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  alloc: { gap: t.space[2.5] },
  stackWrap: { gap: t.space[1] },
  stack: { flexDirection: 'row', height: t.size.rankTrack + t.space[1], borderRadius: t.size.barRadius, overflow: 'hidden', gap: t.hairline * 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[3.5], rowGap: t.space[1.5] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  swatch: { width: t.space[2.5], height: t.space[2.5], borderRadius: t.space[0.5] + 1 },
  disclaimer: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline, paddingTop: t.space[2.5] },
}));
