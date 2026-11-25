import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, type IconColor } from './Icon';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface NavRowProps {
  label: string;
  icon?: LucideIcon;
  iconColor?: IconColor;
  /** resumo à direita (contagem, tipo, pasta) */
  meta?: string;
  onPress?: () => void;
  /** 48 (linha de acesso) ou 52 px (item de lista) */
  tall?: boolean;
  /** linha de ação no destaque (ex.: "Nova pasta"), sem chevron */
  accent?: boolean;
  /** ação perigosa (ex.: "Mover para a lixeira"), sem chevron */
  danger?: boolean;
  /** linha de 1 px no topo (padrão: sim) */
  divider?: boolean;
}

/** Linha de navegação: ícone, texto, resumo e chevron. Separada por linha fina, nunca uma caixa. */
export function NavRow({ label, icon, iconColor, meta, onPress, tall, accent, danger, divider = true }: NavRowProps) {
  const s = useStyles();
  const t = useTheme();
  const tone = danger ? 'danger' : accent ? 'accent' : 'primary';
  const color: IconColor = iconColor ?? (danger ? 'danger' : accent ? 'accentInk' : 'textSecondary');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.row, tall && s.tall, divider && s.divider, pressed && s.pressed]}
    >
      {icon && <Icon icon={icon} size={t.icon.small + t.space[0.5]} color={color} />}
      <Text variant="body" tone={tone} style={s.label} numberOfLines={1}>
        {label}
      </Text>
      {meta !== undefined && (
        <Text variant="caption" tone="tertiary" numeric numberOfLines={1} style={s.meta}>
          {meta}
        </Text>
      )}
      {!accent && !danger && onPress && (
        <View>
          <Icon icon={ChevronRight} size={t.icon.small} color="textTertiary" />
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2] },
  tall: { minHeight: t.size.navRowTall },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  pressed: { backgroundColor: t.colors.soft },
  label: { flex: 1, fontFamily: t.type.item.font },
  meta: { maxWidth: '55%', textAlign: 'right' },
}));
