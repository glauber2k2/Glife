// Contas do controle deslizante (puras, testadas sem React).

/** Valor preso na faixa e arredondado ao passo (sem resíduo de ponto flutuante). */
export function snap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const stepped = min + Math.round((clamped - min) / step) * step;
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(Math.min(max, stepped).toFixed(decimals));
}

/** Valor correspondente à posição `x` num trilho de largura `width`. */
export function valueAt(x: number, width: number, min: number, max: number, step: number): number {
  if (width <= 0) return min;
  return snap(min + (x / width) * (max - min), min, max, step);
}
