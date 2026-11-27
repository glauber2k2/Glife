import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type Palette, type TypeStyle, type TypeVariant } from './theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'accent'
  | 'onAccent'
  | 'tonal'
  | 'inverse'
  | 'inverseAccent'
  | 'inverseMuted'
  | 'success'
  | 'warning'
  | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  /** algarismos tabulares: valores, horas e datas */
  numeric?: boolean;
}

export const toneColor = (c: Palette, tone: TextTone) =>
  ({
    primary: c.text,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    quaternary: c.textQuaternary,
    accent: c.accentInk,
    onAccent: c.onAccent,
    tonal: c.tonalInk,
    inverse: c.inverseInk,
    inverseAccent: c.inverseAccent,
    inverseMuted: c.inverseMuted,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
  })[tone];

export function Text({ variant = 'body', tone = 'primary', align, numeric, style, ...rest }: TextProps) {
  const t = useTheme();
  const v: TypeStyle = t.type[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: v.font,
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          textTransform: v.textTransform,
          fontVariant: numeric ? ['tabular-nums'] : undefined,
          color: toneColor(t.colors, tone),
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
