import type { LucideIcon } from 'lucide-react-native';

import { useTheme, type Palette } from './theme';

export type IconColor = keyof Pick<
  Palette,
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textQuaternary'
  | 'accent'
  | 'accentInk'
  | 'onAccent'
  | 'tonalInk'
  | 'inverseInk'
  | 'inverseAccent'
  | 'danger'
  | 'success'
  | 'warning'
>;

export interface IconProps {
  icon: LucideIcon;
  /** padrão: 20 (ações); t.icon.small (16) em linhas, t.icon.block (19) em blocos de 40 */
  size?: number;
  /** ícones seguem a cor do texto ao redor; o destaque só marca seleção */
  color?: IconColor;
  /** cor literal já resolvida (cor de módulo) */
  rawColor?: string;
}

/** Ícone Lucide, só contorno, traço 1,5. */
export function Icon({ icon: LucideComp, size, color = 'text', rawColor }: IconProps) {
  const t = useTheme();
  return <LucideComp size={size ?? t.icon.size} strokeWidth={t.icon.strokeWidth} color={rawColor ?? t.colors[color]} />;
}
