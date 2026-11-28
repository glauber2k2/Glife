// Geometria dos gráficos de Investimentos, pura (sem React) para testar: linha com buracos (null), rosca com espaço
// entre fatias e barras simples ou divergentes.

export interface LineGeometry {
  /** posição x de cada índice, em px */
  xs: number[];
  /** y de cada série (null = sem dado naquele dia) */
  ys: (number | null)[][];
  /** y da linha de referência, se houver */
  refY: number | null;
}

/** Escala única para todas as séries (e a referência): mínimo embaixo, máximo em cima. */
export function lineGeometry(series: readonly (readonly (number | null)[])[], o: { width: number; height: number; pad: number; reference?: number | null }): LineGeometry {
  const n = Math.max(0, ...series.map((s) => s.length));
  const values = series.flatMap((s) => s.filter((v): v is number => v !== null));
  if (o.reference !== undefined && o.reference !== null) values.push(o.reference);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const y = (v: number) => (max > min ? o.pad + (1 - (v - min) / (max - min)) * (o.height - 2 * o.pad) : o.height / 2);
  const xs = Array.from({ length: n }, (_, i) => (n > 1 ? (i / (n - 1)) * o.width : 0));
  return {
    xs,
    ys: series.map((s) => s.map((v) => (v === null ? null : y(v)))),
    refY: o.reference !== undefined && o.reference !== null ? y(o.reference) : null,
  };
}

/** Caminho SVG que pula os buracos. */
export function pathOf(xs: readonly number[], ys: readonly (number | null)[]): string {
  let d = '';
  let pen = false;
  ys.forEach((y, i) => {
    if (y === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${xs[i]!.toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Índice com dado mais perto da fração `fx` (0–1) da largura. */
export function nearestValid(xs: readonly number[], ys: readonly (number | null)[], fx: number): number | null {
  const width = xs.at(-1) ?? 0;
  let best: number | null = null;
  ys.forEach((y, i) => {
    if (y === null) return;
    if (best === null || Math.abs(xs[i]! - fx * width) < Math.abs(xs[best]! - fx * width)) best = i;
  });
  return best;
}

/** Fatias da rosca como traço de círculo: comprimento (com `gap` a menos) e deslocamento (negativo, sentido horário). */
export function donutArcs(slices: readonly { key: string; value: number }[], circumference: number, gap: number): { key: string; length: number; offset: number }[] {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) return [];
  let acc = 0;
  const out: { key: string; length: number; offset: number }[] = [];
  for (const s of slices) {
    if (s.value <= 0) continue;
    const len = (s.value / total) * circumference;
    out.push({ key: s.key, length: Math.max(len - gap, 0.5), offset: acc === 0 ? 0 : -acc });
    acc += len;
  }
  return out;
}

export const nextSelection = (current: string | null, key: string): string | null => (current === key ? null : key);

/** Barra de cada valor como fração da trilha: `start` e `size` (0–1). Divergente: zero no meio. */
export function rankBars(values: readonly number[], diverging: boolean): { start: number; size: number; negative: boolean }[] {
  const max = Math.max(0, ...values.map(Math.abs)) || 1;
  return values.map((v) => {
    const negative = v < 0;
    if (!diverging) return { start: 0, size: Math.abs(v) / max, negative };
    const size = (Math.abs(v) / max) * 0.5;
    return { start: negative ? 0.5 - size : 0.5, size, negative };
  });
}
