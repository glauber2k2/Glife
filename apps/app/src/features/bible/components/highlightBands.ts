// Faixas do marca-texto desenhadas por trás de cada linha do versículo. Centradas na linha e mais baixas que ela,
// para sobrar um respiro de max(0,42 em, 4 px) entre a faixa de uma linha e a da seguinte (no Android o fundo do
// texto ocupa a linha inteira e as faixas se tocariam; por isso o leitor desenha as faixas ele mesmo).
import { reading } from '@/shared/ui/theme/tokens';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function highlightBands(
  lines: readonly Rect[],
  fontSize: number,
  lineHeightPx: number,
  gapEm: number = reading.highlightGapEm,
  gapMin: number = reading.highlightGapMin,
): Rect[] {
  const gap = Math.max(gapEm * fontSize, gapMin);
  const height = Math.max(0, Math.min(lineHeightPx, lineHeightPx - gap));
  const overhang = reading.bandOverhangEm * fontSize;
  return lines
    .filter((l) => l.width > 0)
    .map((l) => ({ x: l.x - overhang, y: l.y + (l.height - height) / 2, width: l.width + overhang * 2, height }));
}
