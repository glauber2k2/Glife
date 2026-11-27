import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, type IconColor } from './Icon';
import { useSurface } from './surface';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface PillProps {
  label: string;
  onPress?: () => void;
  /** ícone antes do texto */
  icon?: LucideIcon;
  /** ícone depois do texto (ex.: chevron de menu) */
  trailingIcon?: LucideIcon;
  /** md 32 px (barra do editor), sm 26 px (pasta e tags da nota) */
  size?: 'md' | 'sm';
  /** sem borda (ação discreta, ex.: "+ Tag") */
  bare?: boolean;
  tone?: 'primary' | 'secondary' | 'tertiary';
  accessibilityLabel?: string;
}

/** Pílula preenchida (branca no fundo, cinza no cartão) para ações compactas. */
export function Pill({ label, onPress, icon, trailingIcon, size = 'md', bare, tone = 'primary', accessibilityLabel }: PillProps) {
  const s = useStyles();
  const t = useTheme();
  const small = size === 'sm';
  const surface = useSurface();
  const iconColor: IconColor = tone === 'primary' ? 'text' : tone === 'secondary' ? 'textSecondary' : 'textTertiary';
  const content = (
    <>
      {icon && <Icon icon={icon} size={small ? t.icon.tiny : t.icon.small} color={iconColor} />}
      <Text variant={small ? 'caption' : 'chip'} tone={tone}>
        {label}
      </Text>
      {trailingIcon && <Icon icon={trailingIcon} size={t.icon.tiny} color="textQuaternary" />}
    </>
  );
  const style = [s.base, small ? s.sm : s.md, !bare && (surface === 'card' ? s.filledOnCard : s.filled)];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={small ? t.touch.hitSlop : undefined}
      style={({ pressed }) => [...style, pressed && s.pressed]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  // Sem alignSelf: quem posiciona é o pai (numa barra com alignItems center, a pílula fica centrada como os botões).
  base: { flexDirection: 'row', alignItems: 'center', borderRadius: t.radius.full },
  md: { height: t.size.pill, gap: t.space[1.5], paddingHorizontal: t.space[3] },
  sm: { height: t.size.pillSmall, gap: t.space[1], paddingHorizontal: t.space[2] + t.space[0.5] },
  filled: { backgroundColor: t.colors.card },
  filledOnCard: { backgroundColor: t.colors.bg },
  pressed: { opacity: t.opacity.pressed },
}));
