import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, Pressable, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from './Icon';
import { Spinner } from './Spinner';
import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

/** subtle: ghost em tom secundário, para saídas discretas ("Sair") */
/** ghostDanger: ação destrutiva discreta ("Esvaziar lixeira"), sem borda */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'ghostDanger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  /** primary é a única ação de destaque da tela; secondary/ghost para o resto */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  /** retorno tátil leve — use em ações importantes (salvar gasto etc.) */
  haptic?: boolean;
  fullWidth?: boolean;
  /**
   * Alinhamento no eixo cruzado do pai. Padrão 'start' (em coluna, não estica). Em linha com outros elementos use
   * 'center', senão o botão gruda no topo da linha.
   */
  selfAlign?: 'start' | 'center' | 'end';
}

/** Botão em pílula (48 / 40 px). Afunda 0,96 no toque com a mola tap. */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  haptic,
  fullWidth,
  selfAlign = 'start',
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
  const spring = resolveSpring('tap', reduceMotion);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const restScale = t.pressScale.rest;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));

  useEffect(() => {
    if (reduceMotion || isDisabled) scale.set(restScale);
  }, [reduceMotion, isDisabled, scale, restScale]);

  const fg = (
    { primary: 'onAccent', danger: 'danger', ghostDanger: 'danger', ghost: 'accentInk', subtle: 'textSecondary', secondary: 'text' } as const
  )[variant];
  const textTone = (
    { onAccent: 'onAccent', danger: 'danger', accentInk: 'accent', textSecondary: 'secondary', text: 'primary' } as const
  )[fg];

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
      style={[s.wrapper, selfAlign !== 'start' && s[selfAlign], fullWidth && s.fullWidth]}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.base,
            size === 'sm' ? s.sm : s.md,
            s[variant],
            pressed && (reduceMotion ? s.reducedPressed : variant === 'primary' ? s.primaryPressed : s.pressed),
            fullWidth && s.fullWidth,
            isDisabled && s.disabled,
            animatedStyle,
          ]}
        >
          <View style={s.content}>
            {loading ? (
              <Spinner color={fg} />
            ) : (
              icon && <Icon icon={icon} size={t.icon.small} color={fg} />
            )}
            <Text
              variant="button"
              tone={textTone}
              numberOfLines={1}
              style={[(variant === 'secondary' || variant === 'subtle') && s.mediumWeight, size === 'sm' && s.smallText, s.label]}
            >
              {label}
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  // Em linha, o botão não encolhe (o texto ao lado é que quebra) e o rótulo fica numa linha só.
  wrapper: { alignSelf: 'flex-start', flexShrink: 0, maxWidth: '100%' },
  center: { alignSelf: 'center' },
  end: { alignSelf: 'flex-end' },
  base: {
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  md: { minHeight: t.size.button, paddingHorizontal: t.space[6] },
  sm: { minHeight: t.size.buttonSmall, paddingHorizontal: t.space[4] },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], flexShrink: 1 },
  primary: { backgroundColor: t.colors.accent },
  primaryPressed: { backgroundColor: t.colors.accentPressed },
  secondary: { borderWidth: t.hairline, borderColor: t.colors.hairline, backgroundColor: 'transparent' },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: t.space[3] + t.space[0.5] },
  subtle: { backgroundColor: 'transparent', paddingHorizontal: t.space[3] + t.space[0.5] },
  ghostDanger: { backgroundColor: 'transparent', paddingHorizontal: t.space[3] + t.space[0.5] },
  danger: { borderWidth: t.hairline, borderColor: t.colors.hairline, backgroundColor: 'transparent' },
  pressed: { backgroundColor: t.colors.soft },
  reducedPressed: { opacity: t.opacity.pressed },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: t.opacity.disabled },
  mediumWeight: { fontFamily: t.type.chip.font },
  smallText: { fontSize: t.type.chip.fontSize },
  label: { flexShrink: 1 },
}));
