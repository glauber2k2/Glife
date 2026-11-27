import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useInListGroup } from './Card';
import { Icon } from './Icon';
import { ModuleIcon } from './ModuleIcon';
import { Text } from './Text';
import { makeStyles, useTheme, type ModuleKey } from './theme';
import { usePress } from './usePress';

export interface NavRowProps {
  label: string;
  icon?: LucideIcon;
  /** cor do bloco do ícone: módulo ou matiz; sem eles o bloco é neutro (cinza) */
  module?: ModuleKey;
  hue?: number;
  /** bloco de 32 (padrão nas linhas de ajuste) ou 40 */
  iconSize?: 'sm' | 'md';
  /** linha de apoio sob o título (contagem, tipo, pasta) */
  meta?: string;
  /** conteúdo à direita (tag, interruptor, valor); substitui o chevron */
  trailing?: ReactNode;
  onPress?: () => void;
  /** 56 (padrão) ou 60 px */
  tall?: boolean;
  /** linha de ação em cobalto (ex.: "Nova pasta"), sem chevron */
  accent?: boolean;
  /** ação perigosa (ex.: "Mover para a lixeira"), sem chevron */
  danger?: boolean;
  /** linha de 1 px no topo quando fora de um ListGroup (padrão: sim) */
  divider?: boolean;
  /** meta pode quebrar em mais linhas */
  wrapMeta?: boolean;
}

/** Linha de navegação do Cobalto: bloco de ícone, título 15/500, apoio 13 e chevron. Vive num ListGroup. */
export function NavRow({
  label,
  icon,
  module,
  hue,
  iconSize = 'sm',
  meta,
  trailing,
  onPress,
  tall,
  accent,
  danger,
  divider = true,
  wrapMeta,
}: NavRowProps) {
  const s = useStyles();
  const t = useTheme();
  const inGroup = useInListGroup();
  const press = usePress(!onPress);
  const tone = danger ? 'danger' : accent ? 'accent' : 'primary';
  const leading = icon ? (
    accent || danger ? (
      <View style={[s.plainIcon, iconSize === 'md' && s.plainIconMd]}>
        <Icon icon={icon} size={t.icon.size} color={danger ? 'danger' : 'accentInk'} />
      </View>
    ) : (
      <ModuleIcon icon={icon} module={module} hue={hue} size={iconSize} tone={module || hue !== undefined ? 'module' : 'neutral'} />
    )
  ) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      onPress={onPress}
      disabled={!onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[s.row, tall && s.tall, divider && !inGroup && s.divider, press.style]}>
        {leading}
        <View style={s.texts}>
          <Text variant="item" tone={tone} numberOfLines={2}>
            {label}
          </Text>
          {meta !== undefined && (
            <Text variant="caption" tone="tertiary" numeric numberOfLines={wrapMeta ? undefined : 1}>
              {meta}
            </Text>
          )}
        </View>
        {trailing}
        {!trailing && !accent && !danger && onPress && <Icon icon={ChevronRight} size={t.icon.small + t.space[0.5]} color="textQuaternary" />}
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[3] },
  tall: { minHeight: t.size.navRowTall },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  plainIcon: { width: t.size.moduleIconSmall, alignItems: 'center' },
  plainIconMd: { width: t.size.moduleIcon },
}));
