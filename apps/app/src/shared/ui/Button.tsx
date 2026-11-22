import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, View, type PressableProps } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

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
  ...rest
}: ButtonProps) {
  const s = useStyles();
  const t = useTheme();
  const isDisabled = disabled || loading;

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
      style={({ pressed }) => [
        s.base,
        s[variant],
        pressed && (variant === 'primary' ? s.primaryPressed : s.pressed),
        fullWidth && s.fullWidth,
        isDisabled && s.disabled,
      ]}
      {...rest}
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
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
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
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
}));
