import type { LucideIcon } from 'lucide-react-native';

import { useTheme, type Palette } from './theme';

export type IconColor = keyof Pick<
  Palette,
  'text' | 'textSecondary' | 'textTertiary' | 'accentInk' | 'onAccent' | 'danger' | 'success' | 'warning'
>;

export interface IconProps {
  icon: LucideIcon;
  /** padrão: 20 (abas e ações); use t.icon.small (16) em linhas e t.icon.tiny (13) em chips */
  size?: number;
  /** ícones seguem a cor do texto ao redor; o destaque só marca seleção */
  color?: IconColor;
}

/** Ícone Lucide, só contorno, traço 1,5. */
export function Icon({ icon: LucideComp, size, color = 'text' }: IconProps) {
  const t = useTheme();
  return <LucideComp size={size ?? t.icon.size} strokeWidth={t.icon.strokeWidth} color={t.colors[color]} />;
}
