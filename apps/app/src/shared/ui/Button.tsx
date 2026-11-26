import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, View, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconColor } from './Icon';
import { Spinner } from './Spinner';
import { Text, type TextTone } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';
import { usePress } from './usePress';

/**
 * primary — cobalto com sombra azulada, a única ação principal da tela · secondary — tonal (ação secundária) ·
 * neutral — cartão branco sobre o fundo · inverse — tinta escura · ghost — link em cobalto ·
 * subtle — link discreto · danger — vermelho suave · ghostDanger — link vermelho.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'inverse' | 'ghost' | 'subtle' | 'danger' | 'ghostDanger';
/** md 52 · compact 44 · sm 36 */
export type ButtonSize = 'md' | 'compact' | 'sm';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
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
  /** ocupa o espaço que sobrar numa linha de botões (rodapé de folha) */
  grow?: boolean;
}

const fgOf: Record<ButtonVariant, { tone: TextTone; icon: IconColor }> = {
  primary: { tone: 'onAccent', icon: 'onAccent' },
  secondary: { tone: 'tonal', icon: 'tonalInk' },
  neutral: { tone: 'primary', icon: 'text' },
  inverse: { tone: 'inverse', icon: 'inverseInk' },
  ghost: { tone: 'accent', icon: 'accentInk' },
  subtle: { tone: 'secondary', icon: 'textSecondary' },
  danger: { tone: 'danger', icon: 'danger' },
  ghostDanger: { tone: 'danger', icon: 'danger' },
};

/** Botão em pílula (52 / 44 / 36 px). Afunda 0,96 em 90 ms e volta com mola; o primário escurece. */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  haptic,
  fullWidth,
  selfAlign = 'start',
  grow,
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
  const press = usePress(isDisabled ?? undefined);
  const fg = fgOf[variant];
  const link = variant === 'ghost' || variant === 'subtle' || variant === 'ghostDanger';

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
        press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press.onPressOut();
        onPressOut?.(e);
      }}
      style={[s.wrapper, selfAlign !== 'start' && s[selfAlign], (fullWidth || grow) && s.fullWidth, grow && s.grow]}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            s.base,
            s[size],
            s[variant],
            link && s.link,
            pressed && variant === 'primary' && s.primaryPressed,
            pressed && reduceMotion && s.reducedPressed,
            (fullWidth || grow) && s.fullWidth,
            isDisabled && !loading && !link && s.disabledFill,
            isDisabled && link && s.disabledLink,
            press.style,
          ]}
        >
          <View style={s.content}>
            {loading ? (
              <Spinner color={fg.icon} />
            ) : (
              icon && <Icon icon={icon} size={size === 'sm' ? t.icon.small : t.icon.size - t.space[0.5]} color={isDisabled && !link ? 'textQuaternary' : fg.icon} />
            )}
            <Text
              variant="button"
              tone={isDisabled && !link && !loading ? 'quaternary' : fg.tone}
              numberOfLines={1}
              style={[size === 'sm' && s.smallText, size === 'compact' && s.compactText, s.label]}
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
  grow: { flexGrow: 1, flexBasis: 0, flexShrink: 1 },
  base: {
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  md: { minHeight: t.size.button, paddingHorizontal: t.space[5] + t.space[0.5] },
  compact: { minHeight: t.size.buttonMedium, paddingHorizontal: t.space[4] + t.space[0.5] },
  sm: { minHeight: t.size.buttonSmall, paddingHorizontal: t.space[3] + t.space[0.5] },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], flexShrink: 1 },
  primary: { backgroundColor: t.colors.accent, boxShadow: t.colors.shadow.fab },
  primaryPressed: { backgroundColor: t.colors.accentPressed },
  secondary: { backgroundColor: t.colors.tonal },
  neutral: { backgroundColor: t.colors.card },
  inverse: { backgroundColor: t.colors.inverse },
  ghost: { backgroundColor: 'transparent' },
  subtle: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.dangerSoft },
  ghostDanger: { backgroundColor: 'transparent' },
  link: { paddingHorizontal: t.space[3] },
  reducedPressed: { opacity: t.opacity.pressed },
  fullWidth: { alignSelf: 'stretch' },
  disabledFill: { backgroundColor: t.colors.track, boxShadow: [] },
  disabledLink: { opacity: t.opacity.disabled },
  smallText: { fontSize: t.type.chip.fontSize },
  compactText: { fontSize: t.type.item.fontSize },
  label: { flexShrink: 1 },
}));
