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
  const checkWidth = useSharedValue<number>(selected && showCheck ? t.icon.tiny : t.space[0]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ width: checkWidth.get() }));

  useEffect(() => {
    if (reduceMotion || !onPress) scale.set(restScale);
  }, [reduceMotion, onPress, scale, restScale]);

  useEffect(() => {
    const target = selected && showCheck ? t.icon.tiny : t.space[0];
    checkWidth.set(checkSpring ? withSpring(target, checkSpring) : target);
  }, [selected, showCheck, checkSpring, checkWidth, t]);

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
          {icon && <Icon icon={icon} size={t.icon.small - t.space[0.5]} color={selected ? 'onAccent' : 'text'} />}
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
    gap: t.space[1],
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
  checkInner: { width: t.icon.tiny },
}));
