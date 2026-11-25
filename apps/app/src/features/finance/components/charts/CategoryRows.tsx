// "Para onde foi": barras horizontais ordenadas, proporcionais à maior. A maior categoria (se não for Outras) fica
// em destaque; as outras em cinza a 45%. Cada linha é um botão que abre o detalhe da categoria.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Text, makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

import { money } from '../format';
import { sharePct } from './chartFormat';

export interface CategoryRow {
  key: string;
  name: string;
  sub?: string;
  total: number;
  share: number;
  /** a maior categoria do período (destaque) */
  top: boolean;
}

export function CategoryRows({ rows, onOpen }: { rows: readonly CategoryRow[]; onOpen: (key: string) => void }) {
  const s = useStyles();
  const max = Math.max(0, ...rows.map((r) => r.total));
  return (
    <View style={s.list}>
      {rows.map((r, i) => (
        <Pressable
          key={r.key}
          accessibilityRole="button"
          accessibilityLabel={`${r.name}: ${money(r.total)}, ${sharePct(r.share)} dos gastos. Abrir detalhe.`}
          onPress={() => onOpen(r.key)}
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          <View style={s.top}>
            <View style={s.names}>
              <Text style={s.medium}>{r.name}</Text>
              {r.sub ? (
                <Text variant="caption" tone="tertiary">
                  {r.sub}
                </Text>
              ) : null}
            </View>
            <Text numeric style={s.medium}>
              {money(r.total)}
            </Text>
            <Text variant="small" tone={r.top ? 'accent' : 'tertiary'} numeric align="right" style={[s.pct, r.top && s.semibold]}>
              {sharePct(r.share)}
            </Text>
          </View>
          <Grow ratio={max > 0 ? r.total / max : 0} top={r.top} index={i} />
        </Pressable>
      ))}
    </View>
  );
}

/** Barra de 6 px que cresce da esquerda em cascata; na troca de período, a largura vai ao novo valor. */
function Grow({ ratio, top, index }: { ratio: number; top: boolean; index: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const [width, setWidth] = useState(0);
  const w = useSharedValue(0);
  useEffect(() => {
    const target = Math.max(t.space[1], ratio * width);
    w.set(spring ? withDelay(index * t.motion.stagger, withSpring(target, spring)) : target);
  }, [ratio, width, spring, index, w, t]);
  const style = useAnimatedStyle(() => ({ width: w.get() }));
  return (
    <View style={s.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[s.bar, top ? s.barTop : s.barRest, style]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.space[1] },
  row: { gap: t.space[2], paddingVertical: t.space[2] + t.space[0.5], borderRadius: t.radius.field },
  pressed: { opacity: t.opacity.pressed },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] + t.space[0.5] },
  names: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  pct: { width: t.size.pctColumn },
  track: { height: t.size.categoryBar, flexDirection: 'row' },
  bar: { height: '100%', borderRadius: t.radius.full },
  barTop: { backgroundColor: t.colors.accent },
  barRest: { backgroundColor: t.colors.textTertiary, opacity: t.opacity.muted },
}));
