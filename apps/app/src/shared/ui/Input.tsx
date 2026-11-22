import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, style, onFocus, onBlur, ...rest }: InputProps) {
  const s = useStyles();
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.root}>
      {label && (
        <Text variant="label" tone="secondary">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={t.colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[s.field, focused && s.focused, !!error && s.errorField, style]}
        accessibilityLabel={label}
        {...rest}
      />
      {(error || hint) && (
        <Text variant="caption" tone={error ? 'danger' : 'tertiary'}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.space[1] + 2, alignSelf: 'stretch' },
  field: {
    minHeight: t.touch.minTarget,
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[2],
    borderRadius: t.radius.field,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    backgroundColor: t.colors.surface,
    color: t.colors.text,
    fontFamily: t.type.body.font,
    fontSize: t.type.body.fontSize,
  },
  focused: { borderColor: t.colors.accent },
  errorField: { borderColor: t.colors.danger },
}));
