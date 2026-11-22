import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('snappy', reduceMotion);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const restScale = t.pressScale.rest;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? restScale : scale.get() }],
  }));

  useEffect(() => {
    if (reduceMotion || !onPress) scale.set(restScale);
  }, [reduceMotion, onPress, scale, restScale]);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      onPressIn={() => {
        if (onPress) scale.set(spring ? withSpring(t.pressScale.pressed, spring) : restScale);
      }}
      onPressOut={() => {
        scale.set(spring ? withSpring(restScale, spring) : restScale);
      }}
      hitSlop={t.touch.hitSlop}
      style={s.wrapper}
    >
      {({ pressed }) => (
        <Animated.View style={[s.chip, selected && s.selected, pressed && s.pressed, animatedStyle]}>
          <Text variant="caption" tone={selected ? 'accent' : 'secondary'}>
            {label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { alignSelf: 'flex-start' },
  chip: {
    paddingHorizontal: t.space[3],
    minHeight: t.size.chipHeight,
    justifyContent: 'center',
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    alignSelf: 'flex-start',
  },
  selected: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accentSoft },
  pressed: { opacity: t.opacity.pressed },
}));
