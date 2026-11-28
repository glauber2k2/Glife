// Barras do ranking: nome à esquerda, trilha no meio e valor à direita. Divergente põe o zero no meio (verde à
// direita, vermelho à esquerda). As barras crescem em cascata de 70 ms; cada linha pode abrir o ativo.
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text, makeStyles, useReduceMotion, usePress, useTheme, type TextTone } from '@/shared/ui';

import { rankBars } from './investGeometry';

export interface RankRow {
  key: string;
  title: string;
  subtitle?: string;
  value: number;
  label: string;
  color?: string;
  tone?: TextTone;
}

export function RankBars({ rows, diverging = false, numbered = false, onPress }: { rows: readonly RankRow[]; diverging?: boolean; numbered?: boolean; onPress?: (key: string) => void }) {
  const s = useStyles();
  const bars = rankBars(
    rows.map((r) => r.value),
    diverging,
  );
  return (
    <View style={s.list}>
      {rows.map((r, i) => (
        <Row key={r.key} row={r} bar={bars[i]!} index={i} numbered={numbered} diverging={diverging} onPress={onPress} />
      ))}
    </View>
  );
}

function Row({ row, bar, index, numbered, diverging, onPress }: { row: RankRow; bar: ReturnType<typeof rankBars>[number]; index: number; numbered: boolean; diverging: boolean; onPress?: (key: string) => void }) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress(!onPress);
  const reduceMotion = useReduceMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    grow.set(0);
    grow.set(reduceMotion ? 1 : withDelay(Math.min(index, t.motion.staggerMax) * t.motion.stagger, withTiming(1, { duration: t.motion.grow })));
  }, [bar.size, bar.start, grow, index, reduceMotion, t]);
  const fill = useAnimatedStyle(() => {
    const size = bar.size * grow.get() * 100;
    return bar.negative ? { right: `${(1 - bar.start - bar.size) * 100}%`, width: `${size}%` } : { left: `${bar.start * 100}%`, width: `${size}%` };
  });
  const color = diverging ? (bar.negative ? t.colors.danger : t.colors.success) : (row.color ?? t.colors.accent);
  return (
    <Pressable
      onPress={onPress ? () => onPress(row.key) : undefined}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${numbered ? `${index + 1}º, ` : ''}${row.title}, ${row.label}`}
    >
      <Animated.View style={[s.row, press.style]}>
        <View style={s.name}>
          <View style={s.titleRow}>
            {numbered && (
              <Text variant="micro" tone="tertiary" style={s.mono}>
                {index + 1}
              </Text>
            )}
            <Text variant="chip" numberOfLines={1} style={s.title}>
              {row.title}
            </Text>
          </View>
          {row.subtitle ? (
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {row.subtitle}
            </Text>
          ) : null}
        </View>
        <View style={s.track}>
          <Animated.View style={[s.fill, { backgroundColor: color }, fill]} />
          {diverging && <View style={s.zero} />}
        </View>
        <Text variant="chip" tone={row.tone ?? 'primary'} numeric numberOfLines={1} style={s.value}>
          {row.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5], minHeight: t.touch.minTarget, paddingVertical: t.space[1] },
  name: { width: t.size.rankName, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  title: { fontFamily: t.type.button.font, flexShrink: 1 },
  mono: { fontFamily: t.type.mono.font },
  track: { flex: 1, height: t.size.rankTrack, position: 'relative' },
  fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: t.size.barRadius },
  zero: { position: 'absolute', left: '50%', top: -t.space[1], bottom: -t.space[1], width: t.hairline, backgroundColor: t.colors.border },
  value: { width: t.size.rankValue, textAlign: 'right', fontFamily: t.type.button.font },
}));
