import { useEffect, useState, type ReactNode, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from './Text';
import { noFocusRing } from './webStyles';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  /** destaca a borda em vermelho sem mostrar texto (a mensagem fica em outro lugar) */
  invalid?: boolean;
  /** ação à direita, dentro do campo (ex.: mostrar senha) */
  trailing?: ReactNode;
  /** React 19: ref é prop comum e chega ao TextInput (foco, seleção) */
  ref?: Ref<TextInput>;
}

/** Campo contornado de 54 px, cantos de 16, rótulo que flutua para o topo ao focar ou preencher. */
export function Input({
  label,
  hint,
  error,
  invalid,
  trailing,
  style,
  value,
  placeholder,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  const [focused, setFocused] = useState(false);
  const raised = focused || !!value || !label;
  const lift = useSharedValue(raised ? 1 : 0);
  const { labelLift, labelScale } = t.field;
  const hasError = !!error || !!invalid;

  useEffect(() => {
    const target = raised ? 1 : 0;
    lift.set(spring ? withSpring(target, spring) : target);
  }, [raised, spring, lift]);

  const labelStyle = useAnimatedStyle(() => {
    const p = lift.get();
    return {
      transform: [{ translateY: labelLift * p }, { scale: 1 - (1 - labelScale) * p }],
    };
  });

  return (
    <View style={s.root}>
      <View style={[s.box, focused && s.focused, hasError && s.errorField]}>
        {label && (
          <Animated.View pointerEvents="none" style={[s.label, labelStyle]}>
            <Text tone={hasError ? 'danger' : focused ? 'accent' : 'tertiary'}>{label}</Text>
          </Animated.View>
        )}
        <TextInput
          placeholderTextColor={t.colors.textTertiary}
          selectionColor={t.colors.accent}
          value={value}
          // Com rótulo, o placeholder só aparece depois que o rótulo sobe, para não sobrepor.
          placeholder={label && !focused ? undefined : placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.field, noFocusRing, !label && s.fieldNoLabel, !!trailing && s.withTrailing, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {trailing && <View style={s.trailing}>{trailing}</View>}
      </View>
      {(error || hint) && (
        <Text variant="caption" tone={error ? 'danger' : 'tertiary'} style={s.below}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => {
  return {
    root: { gap: t.space[1.5], alignSelf: 'stretch' },
    box: {
      minHeight: t.size.field,
      borderRadius: t.radius.field,
      borderWidth: t.hairline,
      borderColor: t.colors.hairline,
      justifyContent: 'center',
    },
    label: {
      position: 'absolute',
      left: t.field.paddingX,
      top: t.field.labelTop - (t.type.body.lineHeight - t.type.body.fontSize) / 2,
      // Escala a partir do canto, como no design system.
      transformOrigin: 'left top',
    },
    field: {
      flexGrow: 1,
      minHeight: t.size.field - 2 * t.hairline,
      paddingHorizontal: t.field.paddingX,
      paddingTop: t.field.paddingTop,
      paddingBottom: t.field.paddingBottom,
      color: t.colors.text,
      fontFamily: t.type.body.font,
      fontSize: t.type.body.fontSize,
      borderRadius: t.radius.field,
    },
    fieldNoLabel: { paddingTop: t.space[4], paddingBottom: t.space[4] },
    withTrailing: { paddingRight: t.touch.minTarget + t.space[2] },
    trailing: { position: 'absolute', right: t.space[1], top: t.space[1] },
    focused: { borderColor: t.colors.accent },
    errorField: { borderColor: t.colors.danger },
    below: { paddingLeft: t.field.paddingX },
  };
});
