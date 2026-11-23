import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type IconColor } from './Icon';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface IconButtonProps {
  icon: LucideIcon;
  /** obrigatório: é o que o leitor de tela anuncia */
  label: string;
  onPress?: () => void;
  /** outline tem borda de 1 px; ghost não */
  variant?: 'outline' | 'ghost';
  /** padrão 40; use t.touch.minTarget (44) quando for o único alvo da área */
  size?: number;
  color?: IconColor;
  disabled?: boolean;
}

/** Botão redondo só com ícone. Afunda 0,9 no toque. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'outline',
  size,
  color = 'text',
  disabled,
}: IconButtonProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const restScale = t.pressScale.rest;
  const scale = useSharedValue<number>(restScale);
  const dimension = size ?? t.size.iconButton;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));

  useEffect(() => {
    if (reduceMotion || disabled) scale.set(restScale);
  }, [reduceMotion, disabled, scale, restScale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={dimension < t.touch.minTarget ? t.touch.hitSlop : undefined}
      onPressIn={() => scale.set(spring ? withSpring(t.pressScale.pressedSmall, spring) : restScale)}
      onPressOut={() => scale.set(spring ? withSpring(restScale, spring) : restScale)}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.base,
            { width: dimension, height: dimension },
            variant === 'outline' && s.outline,
            pressed && s.pressed,
            disabled && s.disabled,
            animatedStyle,
          ]}
        >
          <Icon icon={icon} color={color} />
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: t.hairline, borderColor: t.colors.hairline },
  pressed: { backgroundColor: t.colors.soft },
  disabled: { opacity: t.opacity.disabled },
}));
