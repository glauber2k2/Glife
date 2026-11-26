import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface SwitchProps {
  value: boolean;
  onChange: (next: boolean) => void;
  /** obrigatório: é o que o leitor de tela anuncia */
  label: string;
  disabled?: boolean;
}

/** Interruptor 50 × 30: trilho vira cobalto, a bolinha branca corre 20 px com mola (300 ms). */
export function Switch({ value, onChange, label, disabled }: SwitchProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const travel = t.size.switchWidth - t.size.switchKnob - 2 * ((t.size.switchHeight - t.size.switchKnob) / 2);
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const target = value ? 1 : 0;
    on.set(spring ? withSpring(target, spring) : target);
  }, [value, spring, on]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: travel * on.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={t.touch.hitSlop + (t.touch.minTarget - t.size.switchHeight) / 2}
      onPress={() => onChange(!value)}
      style={[s.track, value && s.trackOn, disabled && s.disabled]}
    >
      <Animated.View style={[s.knob, value && s.knobOn, knob]} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    width: t.size.switchWidth,
    height: t.size.switchHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.border,
    padding: (t.size.switchHeight - t.size.switchKnob) / 2,
  },
  trackOn: { backgroundColor: t.colors.accent },
  knob: {
    width: t.size.switchKnob,
    height: t.size.switchKnob,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.knob,
    boxShadow: t.colors.shadow.knob,
  },
  knobOn: {},
  disabled: { opacity: t.opacity.disabled },
}));
