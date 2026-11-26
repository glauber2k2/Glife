// Barras verticais dos gráficos (Entradas e saídas, Por mês, miniatura): entradas em contorno, saídas preenchidas,
// o previsto empilhado em cinza claro, o grupo atual em destaque. Uma linha de referência com valor redondo no topo;
// o toque mostra o valor exato numa etiqueta que toma o lugar da referência, e as outras barras esmaecem.
import { niceCeiling, type Bucket } from '@glife/domain/finance';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { Text, makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { MONEY_MASK } from '../format';
import { axisIndices, compactMoney } from './chartFormat';
import { ScrubLayer, ScrubLine, ScrubTag, useScrub } from './scrub';

export interface BarSlot {
  key: string;
  /** rótulo do eixo ("jun", "1–7") */
  axis: string;
  /** primeira linha da etiqueta do toque ("Outubro de 2026") */
  title: string;
  /** segunda linha da etiqueta ("+ R$ 8.400,00 · − R$ 4.907,30") */
  value: string;
  current: boolean;
  /** contorno = entradas; preenchida = saídas */
  bars: { kind: 'outline' | 'fill'; value: Bucket }[];
}

export interface BarChartProps {
  slots: readonly BarSlot[];
  barWidth: number;
  plotHeight: number;
  accessibilityLabel: string;
  /** miniatura: sem referência, sem toque, sem rótulos fora dos do eixo */
  mini?: boolean;
  /** muda quando o período muda: apaga a etiqueta do toque */
  resetKey: string;
}

const total = (b: Bucket) => b.confirmed + b.planned;

export function BarChart({ slots, barWidth, plotHeight, accessibilityLabel, mini = false, resetKey }: BarChartProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { hidden } = useMoneyFormat();
  const [width, setWidth] = useState(0);
  const max = niceCeiling(Math.max(0, ...slots.flatMap((sl) => sl.bars.map((b) => total(b.value)))));
  const n = slots.length;
  const pick = useCallback((fx: number) => Math.floor(fx * n), [n]);
  const { index, layer } = useScrub(pick, resetKey);
  const top = mini ? 0 : t.size.chartTop;
  const axis = axisIndices(n);
  const scrubbed = index !== null ? slots[index] : undefined;
  const colX = index !== null && width > 0 ? ((index + 0.5) / n) * width : 0;
  const selTotal = scrubbed ? Math.max(0, ...scrubbed.bars.map((b) => total(b.value))) : 0;

  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height: top + plotHeight }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {!mini && (
          <Fade visible={index === null} style={s.reference}>
            <Text variant="tab" tone="tertiary" numeric style={s.referenceText}>
              {hidden ? MONEY_MASK : compactMoney(max)}
            </Text>
            <View style={s.referenceLine} />
          </Fade>
        )}
        <View style={[s.plot, { top }]}>
          {slots.map((sl, k) => (
            <Fade key={sl.key} visible={index === null || index === k} dim style={s.slot}>
              {sl.bars.map((b) => (
                <Bar
                  key={b.kind}
                  kind={b.kind}
                  value={b.value}
                  max={max}
                  plotHeight={plotHeight}
                  width={barWidth}
                  current={sl.current}
                  delay={reduceMotion ? 0 : k * t.motion.stagger}
                />
              ))}
            </Fade>
          ))}
        </View>
        {!mini && scrubbed && width > 0 && (
          <>
            <ScrubTag fx={(index! + 0.5) / n} width={width} top={0}>
              <Text variant="tab" tone="tertiary" numeric>
                {scrubbed.title}
              </Text>
              <Text variant="caption" numeric style={s.medium}>
                {scrubbed.value}
              </Text>
            </ScrubTag>
            <ScrubLine x={colX} top={top - t.space[0.5]} height={plotHeight * (1 - (max > 0 ? selTotal / max : 0)) - t.space[1.5]} />
          </>
        )}
        {!mini && <ScrubLayer layer={layer} />}
      </View>
      <View style={s.axis}>
        {slots.map((sl, k) => (
          <Text
            key={sl.key}
            variant="tab"
            tone={sl.current ? 'accent' : 'tertiary'}
            align="center"
            numeric
            numberOfLines={1}
            style={[s.axisLabel, sl.current && s.semibold]}
          >
            {axis.has(k) ? sl.axis : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Esmaece (toque em outra barra: 35%) ou some (referência durante o toque), na mola de toque. */
function Fade({ visible, dim, style, children }: { visible: boolean; dim?: boolean; style: object; children: React.ReactNode }) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const target = visible ? t.opacity.full : dim ? t.opacity.faint : t.opacity.hidden;
  const o = useSharedValue(target);
  useEffect(() => {
    o.set(reduceMotion ? target : withTiming(target, { duration: t.motion.tap }));
  }, [target, reduceMotion, o, t.motion.tap]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View pointerEvents="none" style={[style, a]}>
      {children}
    </Animated.View>
  );
}

/** Uma barra: cresce da base na mola de ênfase; na troca de período vai até o novo valor sem sumir. */
function Bar(p: { kind: 'outline' | 'fill'; value: Bucket; max: number; plotHeight: number; width: number; current: boolean; delay: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const sum = total(p.value);
  const empty = sum <= 0 || p.max <= 0;
  const target = empty ? t.size.barEmpty : Math.max(t.size.barEmpty, (sum / p.max) * p.plotHeight);
  const h = useSharedValue(0);
  const w = useSharedValue(p.width);
  useEffect(() => {
    h.set(spring ? withDelay(p.delay, withSpring(target, spring)) : target);
  }, [target, spring, p.delay, h]);
  useEffect(() => {
    w.set(spring ? withSpring(p.width, spring) : p.width);
  }, [p.width, spring, w]);
  const size = useAnimatedStyle(() => ({ height: h.get(), width: w.get() }));
  const color = p.current ? t.colors.accent : p.kind === 'outline' ? t.colors.textTertiary : t.colors.textSecondary;
  const both = p.value.confirmed > 0 && p.value.planned > 0;
  return (
    <Animated.View style={[s.bar, both && s.barGap, size]}>
      {empty ? (
        <View style={[s.fill, s.empty]} />
      ) : (
        <>
          {p.value.planned > 0 && <View style={[s.segment, s.planned, { flex: p.value.planned }]} />}
          {p.value.confirmed > 0 && (
            <View
              style={[
                s.segment,
                { flex: p.value.confirmed },
                p.kind === 'outline' ? { borderWidth: t.size.barOutline, borderColor: color } : { backgroundColor: color },
              ]}
            />
          )}
        </>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  reference: { position: 'absolute', left: 0, right: 0, top: 0, height: t.size.chartTop },
  referenceText: { position: 'absolute', left: 0, top: t.space[3] },
  referenceLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: t.hairline, backgroundColor: t.colors.hairline },
  plot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  slot: { flex: 1, minWidth: 0, height: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: t.space[0.5] },
  bar: { overflow: 'hidden' },
  barGap: { gap: t.hairline },
  segment: { minHeight: 0, borderRadius: t.size.barRadius },
  planned: { backgroundColor: t.colors.planned },
  fill: { flex: 1 },
  empty: { borderRadius: t.size.barRadius, backgroundColor: t.colors.hairline },
  axis: { flexDirection: 'row', marginTop: t.space[2] },
  axisLabel: { flex: 1, minWidth: 0 },
}));
