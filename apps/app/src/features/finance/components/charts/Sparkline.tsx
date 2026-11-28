// Mini gráfico da lista de ativos: a forma do preço recente, em verde (resultado positivo) ou vermelho.
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/shared/ui';

export function Sparkline({ values, tone }: { values: readonly number[]; tone: 'ok' | 'bad' }) {
  const t = useTheme();
  const w = t.size.sparkWidth;
  const h = t.size.sparkHeight;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = t.space[0.5];
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(pad + (max > min ? 1 - (v - min) / (max - min) : 0.5) * (h - 2 * pad)).toFixed(1)}`)
    .join('');
  return (
    <Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={d} fill="none" stroke={tone === 'ok' ? t.colors.success : t.colors.danger} strokeWidth={t.icon.strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
