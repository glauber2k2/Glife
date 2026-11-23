import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text, makeStyles, noFocusRing, riseIn, useReduceMotion, useTheme } from '@/shared/ui';

import { OTP_LENGTH, nextOtpValue, splitOtp } from './otp';

export interface CodeFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** chamado no 6º dígito: o código é enviado sozinho */
  onComplete: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Seis casas em dois grupos de 3, como os autenticadores mostram (482 193).
 * Por baixo é um único TextInput transparente: colar, preencher automaticamente e apagar funcionam
 * como num campo comum, e o leitor de tela anuncia um só campo.
 */
export function CodeField({ value, onChange, onComplete, invalid, disabled, autoFocus }: CodeFieldProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [hasFocus, setHasFocus] = useState(!!autoFocus);
  const { digits, focus } = splitOtp(value);
  const half = OTP_LENGTH / 2;

  const handleChange = (raw: string) => {
    const next = nextOtpValue(value, raw, !!invalid);
    onChange(next);
    if (next.length === OTP_LENGTH && next !== value) onComplete(next);
  };

  const slot = (i: number) => {
    const d = digits[i];
    const focused = hasFocus && !invalid && !disabled && i === focus;
    return (
      <View key={i} style={[s.slot, focused && s.focused, invalid && s.invalid]}>
        {d ? (
          <Animated.View
            entering={reduceMotion ? undefined : riseIn(t.space[1], t.motion.tap)}
          >
            <Text variant="digit" numeric>
              {d}
            </Text>
          </Animated.View>
        ) : (
          focused && <View style={s.caret} />
        )}
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      disabled={disabled}
      style={[s.root, disabled && s.disabled]}
      accessible={false}
    >
      <View style={s.group}>{[0, 1, 2].map(slot)}</View>
      <View style={s.group}>{[0, 1, 2].map((i) => slot(i + half))}</View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH + 1}
        caretHidden
        selectionColor="transparent"
        accessibilityLabel="Código de 6 dígitos"
        style={[s.input, noFocusRing]}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flexDirection: 'row', gap: t.space[4], alignSelf: 'stretch' },
  group: { flex: 1, flexDirection: 'row', gap: t.space[2] },
  slot: {
    flex: 1,
    minWidth: 0,
    height: t.size.field,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    borderRadius: t.radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: { borderColor: t.colors.accent },
  invalid: { borderColor: t.colors.danger },
  caret: { width: t.size.caretWidth, height: t.size.caretHeight, backgroundColor: t.colors.accent },
  disabled: { opacity: t.opacity.disabled },
  input: {
    position: 'absolute',
    top: t.space[0],
    left: t.space[0],
    right: t.space[0],
    bottom: t.space[0],
    opacity: t.opacity.hidden,
    color: 'transparent',
  },
}));
