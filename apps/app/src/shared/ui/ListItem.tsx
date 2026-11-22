import type { LucideIcon } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from './Icon';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface ListItemProps {
  title: string;
  subtitle?: string;
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
        ? LinearTransition.duration(t.spring.standard.duration).easing(Easing.out(Easing.cubic))
        : LinearTransition.springify(t.spring.standard.duration).dampingRatio(t.spring.standard.dampingRatio),
      entering: FadeIn.duration(t.motion.base),
      exiting: FadeOut.duration(t.motion.base),
    };
  }, [animated, reduceMotion, t]);
  const body = (
    <>
      {icon && (
        <View style={s.leading}>
          <Icon icon={icon} color="textSecondary" />
        </View>
      )}
      <View style={s.texts}>
        <Text variant="bodyMedium" numberOfLines={1}>
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
    paddingVertical: t.space[3],
  },
  pressed: { opacity: t.opacity.pressed },
  separator: { borderBottomWidth: t.hairline, borderBottomColor: t.colors.hairline },
  leading: { width: t.icon.size + t.space[1], alignItems: 'center' },
  texts: { flex: 1, gap: t.space[0.5] },
  trailing: { alignItems: 'flex-end' },
}));
