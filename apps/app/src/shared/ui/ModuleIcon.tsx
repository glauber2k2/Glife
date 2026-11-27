import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from './Icon';
import { makeStyles, moduleColors, moduleHue, useTheme, type ModuleKey } from './theme';

export interface ModuleIconProps {
  icon: LucideIcon;
  /** módulo (cor própria) ou matiz livre de 0 a 360 (categorias, pastas) */
  module?: ModuleKey;
  hue?: number;
  /** md 40 · sm 32 · lg 56 · chip 22 */
  size?: 'md' | 'sm' | 'lg' | 'chip';
  /** neutral — cinza · accent — cobalto cheio · tonal — IA · dashed — tracejado (adicionar) · danger */
  tone?: 'module' | 'neutral' | 'accent' | 'tonal' | 'dashed' | 'danger';
}

/** Bloco de ícone de módulo: fundo suave no matiz do módulo e ícone forte. */
export function ModuleIcon({ icon, module, hue, size = 'md', tone = 'module' }: ModuleIconProps) {
  const s = useStyles();
  const t = useTheme();
  const h = hue ?? (module ? moduleHue[module] : moduleHue.neutral);
  const colors = moduleColors(h, t.scheme);
  const iconSize = { md: t.icon.block, sm: t.icon.blockSmall, lg: t.icon.large, chip: t.icon.tiny }[size];
  const fill = tone === 'module' ? { backgroundColor: colors.soft } : s[tone];
  const color = {
    module: colors.strong,
    neutral: t.colors.textSecondary,
    accent: t.colors.onAccent,
    tonal: t.colors.tonalInk,
    dashed: t.colors.textTertiary,
    danger: t.colors.danger,
  }[tone];
  return (
    <View style={[s.base, s[size], fill]}>
      <Icon icon={icon} size={iconSize} rawColor={color} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  md: { width: t.size.moduleIcon, height: t.size.moduleIcon, borderRadius: t.radius.icon },
  sm: { width: t.size.moduleIconSmall, height: t.size.moduleIconSmall, borderRadius: t.radius.iconSmall },
  lg: { width: t.size.moduleIconLarge, height: t.size.moduleIconLarge, borderRadius: t.radius.fieldLarge },
  chip: { width: t.size.moduleIconChip, height: t.size.moduleIconChip, borderRadius: t.radius.checkbox },
  module: {},
  neutral: { backgroundColor: t.colors.bg },
  accent: { backgroundColor: t.colors.accent },
  tonal: { backgroundColor: t.colors.tonal },
  dashed: { borderWidth: t.size.radioBorder, borderColor: t.colors.border, borderStyle: 'dashed' },
  danger: { backgroundColor: t.colors.dangerSoft },
}));
