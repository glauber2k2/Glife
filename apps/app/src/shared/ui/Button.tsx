import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from './Icon';
import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  /** retorno tátil leve — use em ações importantes (salvar gasto etc.) */
  haptic?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  haptic,
  fullWidth,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const s = useStyles();
  const t = useTheme();
  const isDisabled = disabled || loading;
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('snappy', reduceMotion);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const restScale = t.pressScale.rest;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));

  useEffect(() => {
    if (reduceMotion || isDisabled) scale.set(restScale);
  }, [reduceMotion, isDisabled, scale, restScale]);

  const fg = (
    { primary: 'onAccent', danger: 'danger', ghost: 'accent', secondary: 'text' } as const
  )[variant];
  const textTone = fg === 'text' ? 'primary' : fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      onPressIn={(e) => {
        scale.set(spring ? withSpring(t.pressScale.pressed, spring) : restScale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(spring ? withSpring(restScale, spring) : restScale);
        onPressOut?.(e);
      }}
      style={[s.wrapper, fullWidth && s.fullWidth]}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.base,
            s[variant],
            pressed && (reduceMotion ? s.reducedPressed : variant === 'primary' ? s.primaryPressed : s.pressed),
            fullWidth && s.fullWidth,
            isDisabled && s.disabled,
            animatedStyle,
          ]}
        >
          <View style={s.content}>
            {loading ? (
              <ActivityIndicator size="small" color={t.colors[fg]} />
            ) : (
              icon && <Icon icon={icon} color={fg} />
            )}
            <Text variant="label" tone={textTone}>
              {label}
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { alignSelf: 'flex-start' },
  base: {
    minHeight: t.touch.minTarget,
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.field,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  primary: { backgroundColor: t.colors.accent },
  primaryPressed: { backgroundColor: t.colors.accentPressed },
  secondary: { borderWidth: t.hairline, borderColor: t.colors.hairline, backgroundColor: t.colors.surface },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: t.space[2] },
  danger: { borderWidth: t.hairline, borderColor: t.colors.hairline, backgroundColor: 'transparent' },
  pressed: { backgroundColor: t.colors.surfacePressed },
  reducedPressed: { opacity: t.opacity.pressed },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: t.opacity.disabled },
}));
