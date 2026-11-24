import { Check, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from './Icon';
import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** sm (32 px) esconde o check */
  size?: 'md' | 'sm';
  /** ícone antes do texto (categoria, conta); acompanha a cor do texto */
  icon?: LucideIcon;
  /** algarismos tabulares (ex.: "10×") */
  numeric?: boolean;
}

/** Chip de filtro em pílula. Selecionado = preenchido com o destaque; no tamanho md mostra um check. */
export function Chip({ label, selected, onPress, size = 'md', icon, numeric }: ChipProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const checkSpring = resolveSpring('standard', reduceMotion);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const restScale = t.pressScale.rest;
  const showCheck = size === 'md';
  // Largura constante: o check (13 + 4 px) nasce dentro do respiro lateral, que encolhe na mesma medida.
  // Assim marcar um chip nunca muda a largura dele nem quebra a linha dos vizinhos.
  const padding = t.space[3] + t.space[0.5];
  const checkSpace = t.icon.tiny + t.space[1];
  const progress = useSharedValue<number>(selected ? 1 : 0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    width: t.icon.tiny * progress.get(),
    marginRight: t.space[1] * progress.get(),
  }));
  const paddingStyle = useAnimatedStyle(() => {
    const side = padding + (checkSpace / 2) * (1 - progress.get());
    return { paddingLeft: side, paddingRight: side };
  });

  useEffect(() => {
    if (reduceMotion || !onPress) scale.set(restScale);
  }, [reduceMotion, onPress, scale, restScale]);

  useEffect(() => {
    const target = selected ? 1 : 0;
    progress.set(checkSpring ? withSpring(target, checkSpring) : target);
  }, [selected, checkSpring, progress]);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      onPressIn={() => {
        if (onPress) scale.set(spring ? withSpring(t.pressScale.pressed, spring) : restScale);
      }}
      onPressOut={() => {
        scale.set(spring ? withSpring(restScale, spring) : restScale);
      }}
      hitSlop={t.touch.hitSlop}
      style={s.wrapper}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.chip,
            size === 'sm' && s.small,
            selected && s.selected,
            pressed && !selected && s.pressed,
            showCheck && paddingStyle,
            animatedStyle,
          ]}
        >
          {showCheck && (
            <Animated.View style={[s.check, checkStyle]}>
              <View style={s.checkInner}>
                <Icon icon={Check} size={t.icon.tiny} color="onAccent" />
              </View>
            </Animated.View>
          )}
          {icon && (
            <View style={s.icon}>
              <Icon icon={icon} size={t.icon.small - t.space[0.5]} color={selected ? 'onAccent' : 'text'} />
            </View>
          )}
          <Text variant="chip" tone={selected ? 'onAccent' : 'primary'} numeric={numeric}>
            {label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.space[3] + t.space[0.5],
    minHeight: t.size.chipHeight,
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    alignSelf: 'flex-start',
  },
  small: { minHeight: t.size.chipSmall },
  selected: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  pressed: { backgroundColor: t.colors.soft },
  check: { overflow: 'hidden' },
  icon: { marginRight: t.space[1] },
  checkInner: { width: t.icon.tiny },
}));
