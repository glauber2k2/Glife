import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type Palette, type TypeVariant } from './theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'success' | 'warning' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

const toneColor = (c: Palette, tone: TextTone) =>
  ({
    primary: c.text,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    accent: c.accent,
    onAccent: c.onAccent,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
  })[tone];

export function Text({ variant = 'body', tone = 'primary', align, style, ...rest }: TextProps) {
  const t = useTheme();
  const v = t.type[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: v.font,
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          color: toneColor(t.colors, tone),
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
