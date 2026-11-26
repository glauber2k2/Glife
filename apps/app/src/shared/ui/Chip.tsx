import { Check, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from './Icon';
import { useSurface } from './surface';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';
import { usePress } from './usePress';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** md 36 px com espaço do check reservado; sm 32 px sem check */
  size?: 'md' | 'sm';
  /** ícone antes do texto (categoria, conta); acompanha a cor do texto */
  icon?: LucideIcon;
  /** algarismos tabulares (ex.: "10×") */
  numeric?: boolean;
}

/**
 * Chip em pílula: branco no fundo, cinza dentro de cartões. Marcado = tonal cobalto com check que surge com mola;
 * o espaço do check é sempre reservado, então marcar nunca muda a largura.
 */
export function Chip({ label, selected, onPress, size = 'md', icon, numeric }: ChipProps) {
  const s = useStyles();
  const t = useTheme();
  const surface = useSurface();
  const reduceMotion = useReduceMotion();
  const press = usePress(!onPress);
  const showCheck = size === 'md';
  const mark = useSharedValue<number>(selected ? 1 : 0);

  useEffect(() => {
    const target = selected ? 1 : 0;
    mark.set(reduceMotion ? withTiming(target, { duration: t.motion.reduced }) : withSpring(target, t.spring.tap));
  }, [selected, reduceMotion, mark, t]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, mark.get())),
    transform: [{ scale: reduceMotion ? 1 : 0.4 + 0.6 * mark.get() }],
  }));

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={t.touch.hitSlop}
      style={s.wrapper}
    >
      <Animated.View
        style={[s.chip, surface === 'card' && s.onCard, size === 'sm' && s.small, selected && s.selected, press.style]}
      >
        {showCheck && (
          <Animated.View style={[s.check, checkStyle]}>
            <Icon icon={Check} size={t.icon.small} color="tonalInk" />
          </Animated.View>
        )}
        {icon && <Icon icon={icon} size={t.icon.small} color={selected ? 'tonalInk' : 'text'} />}
        <Text variant="chip" tone={selected ? 'tonal' : 'primary'} numeric={numeric}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1.5],
    paddingHorizontal: t.space[3.5],
    minHeight: t.size.chipHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.card,
    alignSelf: 'flex-start',
  },
  onCard: { backgroundColor: t.colors.bg },
  small: { minHeight: t.size.chipSmall, paddingHorizontal: t.space[3] },
  selected: { backgroundColor: t.colors.tonal },
  check: { width: t.icon.small, marginLeft: -t.space[1] },
}));
