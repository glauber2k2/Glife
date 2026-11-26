import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconColor } from './Icon';
import { useSurface } from './surface';
import { makeStyles, useTheme } from './theme';
import { usePress } from './usePress';

export interface IconButtonProps {
  icon: LucideIcon;
  /** obrigatório: é o que o leitor de tela anuncia */
  label: string;
  onPress?: () => void;
  /**
   * card (padrão; `outline` é o mesmo) — círculo branco sobre o fundo · soft — círculo cinza dentro de cartões e
   * folhas · ghost — sem fundo · tonal · accent · onInverse — sobre cartão escuro
   */
  variant?: 'card' | 'outline' | 'soft' | 'ghost' | 'tonal' | 'accent' | 'onInverse';
  /** padrão 42; t.size.iconButtonSmall (36) nos menores */
  size?: number;
  color?: IconColor;
  disabled?: boolean;
  /** ponto cobalto de "há novidade" */
  badge?: boolean;
}

/** Botão circular só com ícone (42 px). Afunda 0,96 no toque. */
export function IconButton({ icon, label, onPress, variant = 'card', size, color, disabled, badge }: IconButtonProps) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress(disabled);
  const dimension = size ?? t.size.iconButton;
  const fg: IconColor =
    color ?? (variant === 'accent' ? 'onAccent' : variant === 'tonal' ? 'tonalInk' : variant === 'onInverse' ? 'inverseInk' : 'text');
  const surface = useSurface();
  const card = variant === 'outline' || variant === 'card';
  const kind = card ? (surface === 'card' ? 'soft' : 'card') : variant;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={dimension < t.touch.minTarget ? (t.touch.minTarget - dimension) / 2 + t.touch.hitSlop : undefined}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.base,
            { width: dimension, height: dimension },
            s[kind],
            pressed && kind === 'ghost' && s.pressedGhost,
            disabled && s.disabled,
            press.style,
          ]}
        >
          <Icon icon={icon} color={fg} />
          {badge && <View style={s.badge} />}
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: t.colors.card },
  soft: { backgroundColor: t.colors.bg },
  ghost: { backgroundColor: 'transparent' },
  tonal: { backgroundColor: t.colors.tonal },
  accent: { backgroundColor: t.colors.accent },
  onInverse: { backgroundColor: t.colors.onInverseSoft },
  pressedGhost: { backgroundColor: t.colors.soft },
  disabled: { opacity: t.opacity.disabled },
  badge: {
    position: 'absolute',
    top: t.space[2] + t.space[0.5],
    right: t.space[2] + t.space[0.5],
    width: t.size.badge,
    height: t.size.badge,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
    borderWidth: t.space[0.5],
    borderColor: t.colors.card,
  },
}));
