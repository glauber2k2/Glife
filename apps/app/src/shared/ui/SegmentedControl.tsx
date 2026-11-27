import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** obrigatório: é o que o leitor de tela anuncia para o grupo */
  label: string;
  /** pill — trilho em pílula de 32 px (Ajustes, filtros); padrão — trilho r14 de 34 px que ocupa a largura */
  shape?: 'pill' | 'block';
  /** ocupa a largura toda (padrão no formato block) */
  fullWidth?: boolean;
}

/**
 * Controle segmentado do Cobalto: trilho cinza e um indicador branco com sombra leve que desliza (340 ms) até a
 * opção escolhida. Casas de largura igual. `pill` (32 px) ou `block` (34 px, r14, ocupa a largura).
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, shape = 'pill', fullWidth }: SegmentedControlProps<T>) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  const pill = shape === 'pill';
  const stretch = fullWidth ?? !pill;
  const [rootWidth, setRootWidth] = useState(0);
  const pad = pill ? t.space[0.5] + t.hairline : t.space[1];
  // Largura natural de cada casa: muda quando a fonte termina de carregar, por isso a medida nunca é congelada.
  // Todas as casas ficam com a largura da maior (grade 1fr do protótipo), então a posição é índice × largura;
  // no web o onLayout não avisa quando só a posição muda.
  const [widths, setWidths] = useState<Record<number, number>>({});
  const measured = Object.keys(widths).length === options.length;
  const cell = stretch
    ? rootWidth > 0 ? (rootWidth - 2 * pad) / options.length : t.space[0]
    : measured ? Math.max(...Object.values(widths)) : t.space[0];
  const ready = stretch ? rootWidth > 0 : measured;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const x = useSharedValue(0);
  const lastIndex = useRef(index);
  useEffect(() => {
    const target = index * cell;
    // Só a troca de opção anima; a primeira medida (ou a fonte carregando) posiciona direto.
    const moved = lastIndex.current !== index;
    lastIndex.current = index;
    x.set(spring && moved ? withSpring(target, spring) : target);
  }, [index, cell, spring, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setWidths((prev) => (prev[i] === w ? prev : { ...prev, [i]: w }));
  };

  const slop = (t.touch.minTarget - t.size.segment) / 2;

  return (
    <View
      role="radiogroup"
      aria-label={label}
      style={[s.root, pill ? s.rootPill : s.rootBlock, stretch && s.stretch]}
      onLayout={stretch ? (e) => setRootWidth(e.nativeEvent.layout.width) : undefined}
    >
      {ready && (
        <Animated.View
          pointerEvents="none"
          style={[s.indicator, pill ? s.indicatorPill : s.indicatorBlock, { width: cell }, indicator]}
        />
      )}
      {options.map((o, i) => {
        const on = i === index;
        return (
          <Pressable
            key={o.value}
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            hitSlop={{ top: slop, bottom: slop }}
            onPress={() => onChange(o.value)}
            onLayout={measure(i)}
            style={[s.option, pill ? s.optionPill : s.optionBlock, stretch ? s.flex : measured && { minWidth: cell }]}
          >
            <Text variant="chip" tone={on ? 'primary' : 'secondary'} numberOfLines={1} style={[pill && s.textPill, on && s.textOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: t.colors.track },
  rootPill: { padding: t.space[0.5] + t.hairline, borderRadius: t.radius.full },
  rootBlock: { padding: t.space[1], borderRadius: t.radius.segmentTrack },
  stretch: { alignSelf: 'stretch' },
  indicator: {
    position: 'absolute',
    backgroundColor: t.scheme === 'dark' ? t.colors.card2 : t.colors.card,
    boxShadow: t.colors.shadow.segment,
  },
  indicatorPill: { top: t.space[0.5] + t.hairline, left: t.space[0.5] + t.hairline, height: t.size.segmentPill, borderRadius: t.radius.full },
  indicatorBlock: { top: t.space[1], left: t.space[1], height: t.size.segment, borderRadius: t.radius.segment },
  option: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.space[3] },
  optionPill: { height: t.size.segmentPill },
  optionBlock: { height: t.size.segment, paddingHorizontal: t.space[2] },
  flex: { flex: 1 },
  textPill: { fontSize: t.type.caption.fontSize },
  // o escolhido em 600; o indicador tem a largura fixa da casa, então o peso não move nada
  textOn: { fontFamily: t.type.tag.font },
}));
