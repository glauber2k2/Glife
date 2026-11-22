import type { LucideIcon } from 'lucide-react-native';

import { useTheme, type Palette } from './theme';

export interface IconProps {
  icon: LucideIcon;
  /** padrão: 20 (token) */
  size?: number;
  color?: keyof Pick<Palette, 'text' | 'textSecondary' | 'textTertiary' | 'accent' | 'onAccent' | 'danger' | 'success'>;
}

/** Ícone Lucide com traço fino 1,5 e tamanho 20 por padrão. */
export function Icon({ icon: LucideComp, size, color = 'text' }: IconProps) {
  const t = useTheme();
  return <LucideComp size={size ?? t.icon.size} strokeWidth={t.icon.strokeWidth} color={t.colors[color]} />;
}
