import type { LucideIcon } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useInListGroup } from './Card';
import { ModuleIcon } from './ModuleIcon';
import { riseIn } from './Reveal';
import { Text } from './Text';
import { makeStyles, useTheme, type ModuleKey } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';
import { usePress } from './usePress';

export interface ListItemProps {
  title: string;
  /** texto ou trecho com partes destacadas (Text aninhado) */
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** cor do bloco do ícone (módulo ou matiz); sem eles, neutro */
  module?: ModuleKey;
  hue?: number;
  /** bloco próprio à esquerda (substitui o ícone) */
  leading?: ReactNode;
  /** conteúdo à direita (valor, data, chevron…) */
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** linha fina embaixo quando fora de um ListGroup; desligue no último item */
  separator?: boolean;
  /** Entrada, saída e reorganização; respeita a preferência de movimento do sistema. */
  animated?: boolean;
  /** quantas linhas o título pode usar */
  titleLines?: number;
}

/** Linha de lista do Cobalto: bloco de ícone 40, título 15/500, apoio 13/18 e ponta à direita. Mínimo 56 px. */
export function ListItem({
  title,
  subtitle,
  icon,
  module,
  hue,
  leading,
  trailing,
  onPress,
  onLongPress,
  separator = true,
  animated = false,
  titleLines = 1,
}: ListItemProps) {
  const s = useStyles();
  const t = useTheme();
  const inGroup = useInListGroup();
  const press = usePress(!onPress);
  const reduceMotion = useReduceMotion();
  const animations = useMemo(() => {
    if (!animated || reduceMotion) return undefined;
    return {
      // Reanimated ainda não oferece springify nas animações de layout da web.
      layout: Platform.OS === 'web'
        ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
        : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio),
      entering: riseIn(t.motion.enterOffset, t.motion.emphasis),
      exiting: FadeOut.duration(t.motion.tap),
    };
  }, [animated, reduceMotion, t]);
  const body = (
    <>
      {leading ?? (icon && <ModuleIcon icon={icon} module={module} hue={hue} tone={module || hue !== undefined ? 'module' : 'neutral'} />)}
      <View style={s.texts}>
        <Text variant="item" numberOfLines={titleLines}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="tertiary" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={s.trailing}>{trailing}</View>}
    </>
  );

  return (
    <Animated.View
      collapsable={false}
      style={separator && !inGroup && s.separator}
      entering={animations?.entering}
      exiting={animations?.exiting}
      layout={animations?.layout}
    >
      {onPress || onLongPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.View style={[s.row, press.style]}>{body}</Animated.View>
        </Pressable>
      ) : (
        <View style={s.row}>{body}</View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3],
  },
  separator: { borderBottomWidth: t.hairline, borderBottomColor: t.colors.hairline },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  trailing: { alignItems: 'flex-end', gap: t.space[0.5], flexShrink: 0 },
}));
