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
}

/**
 * Seletor de 2 a 4 opções em pílula (32 px): casas de largura igual e um indicador `soft` com linha de 1 px
 * que desliza na mola standard até a opção escolhida. Rótulos 12,5/600; o escolhido em `text`, os outros em terciário.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  // Largura natural de cada casa: muda quando a fonte termina de carregar, por isso a medida nunca é congelada.
  // Todas as casas ficam com a largura da maior (grade 1fr do protótipo), então a posição é índice × largura;
  // no web o onLayout não avisa quando só a posição muda.
  const [widths, setWidths] = useState<Record<number, number>>({});
  const measured = Object.keys(widths).length === options.length;
  const cell = measured ? Math.max(...Object.values(widths)) : t.space[0];
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

  const slop = (t.touch.minTarget - t.size.pill) / 2;

  return (
    <View role="radiogroup" aria-label={label} style={s.root}>
      {measured && <Animated.View pointerEvents="none" style={[s.indicator, { width: cell }, indicator]} />}
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
            style={[s.option, measured && { minWidth: cell }]}
          >
            <Text variant="eyebrow" tone={on ? 'primary' : 'tertiary'} style={s.text}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: t.space[0.5],
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    borderRadius: t.radius.full,
  },
  indicator: {
    position: 'absolute',
    top: t.space[0.5],
    left: t.space[0.5],
    height: t.size.pillSmall,
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    backgroundColor: t.colors.soft,
  },
  option: {
    height: t.size.pillSmall,
    paddingHorizontal: t.space[3] + t.space[0.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 12,5/600 como no protótipo: a legenda com o peso dos rótulos.
  text: { fontFamily: t.type.label.font },
}));
