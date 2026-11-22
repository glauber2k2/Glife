import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { makeStyles } from './theme';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** conteúdo à direita (valor, data, chevron…) */
  trailing?: ReactNode;
  onPress?: () => void;
  /** linha fina embaixo; desligue no último item */
  separator?: boolean;
}

export function ListItem({ title, subtitle, icon, trailing, onPress, separator = true }: ListItemProps) {
  const s = useStyles();
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
    <View style={separator && s.separator}>
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
    </View>
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
  pressed: { opacity: 0.6 },
  separator: { borderBottomWidth: t.hairline, borderBottomColor: t.colors.hairline },
  leading: { width: t.icon.size + t.space[1], alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end' },
}));
