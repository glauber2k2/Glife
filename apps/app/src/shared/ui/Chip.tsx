import { Pressable } from 'react-native';

import { Text } from './Text';
import { makeStyles } from './theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [s.chip, selected && s.selected, pressed && s.pressed]}
    >
      <Text variant="caption" tone={selected ? 'accent' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    paddingHorizontal: t.space[3],
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    alignSelf: 'flex-start',
  },
  selected: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accentSoft },
  pressed: { opacity: 0.6 },
}));
