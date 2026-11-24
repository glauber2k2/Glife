import type { LucideIcon } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from './Icon';
import { riseIn } from './Reveal';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface ListItemProps {
  title: string;
  /** texto ou trecho com partes destacadas (Text aninhado) */
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** conteúdo à direita (valor, data, chevron…) */
  trailing?: ReactNode;
  onPress?: () => void;
  /** linha fina embaixo; desligue no último item */
  separator?: boolean;
  /** Entrada, saída e reorganização; respeita a preferência de movimento do sistema. */
  animated?: boolean;
}

export function ListItem({ title, subtitle, icon, trailing, onPress, separator = true, animated = false }: ListItemProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const animations = useMemo(() => {
    if (!animated || reduceMotion) return undefined;
    return {
      // Reanimated ainda não oferece springify nas animações de layout da web.
      layout: Platform.OS === 'web'
        ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
        : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio),
      entering: riseIn(t.motion.enterOffset, t.motion.standard),
      exiting: FadeOut.duration(t.motion.tap),
    };
  }, [animated, reduceMotion, t]);
  const body = (
    <>
      {icon && (
        <View style={s.leading}>
          <Icon icon={icon} size={t.icon.small} color="textSecondary" />
        </View>
      )}
      <View style={s.texts}>
        <Text variant="item" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" tone="tertiary" numberOfLines={2}>
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
      style={separator && s.separator}
      entering={animations?.entering}
      exiting={animations?.exiting}
      layout={animations?.layout}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          {body}
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
    minHeight: t.touch.minTarget + t.space[2],
    paddingVertical: t.space[3] + t.space[0.5],
  },
  pressed: { backgroundColor: t.colors.soft },
  separator: { borderBottomWidth: t.hairline, borderBottomColor: t.colors.hairline },
  leading: { width: t.icon.size, alignItems: 'center' },
  texts: { flex: 1, gap: t.space[0.5] },
  trailing: { alignItems: 'flex-end' },
}));
