// Preço do deepseek-flash (página oficial "Models & Pricing", consultada em 27/11/2026). O teto é em dólar, a mesma
// moeda da recarga na DeepSeek (sem cotação). Contas em micro-dólares inteiros, arredondando para cima.

export interface AiUsage {
  cacheHitTokens: number;
  cacheMissTokens: number;
  outputTokens: number;
}

/** Micro-dólares por milhão de tokens no horário de pico ($0.006 / $0.30 / $1.20); fora do pico é a metade. */
export const DEEPSEEK_FLASH_PRICE = { cacheHit: 6_000, cacheMiss: 300_000, output: 1_200_000 } as const;

/** Teto padrão por mês: US$ 2,00 (em micro-dólares; US$ 1 = 1.000.000). */
export const AI_DEFAULT_CAP_MICRO_USD = 2_000_000;

/** Pico: 01:00–04:00 e 06:00–10:00 UTC, segunda a sexta. Feriados chineses contam como pico (lado seguro). */
export function isDeepSeekPeak(at: Date): boolean {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = at.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

/** `at: 'peak'` cobra como horário de pico (estimativa pelo lado caro). */
export function costMicroUsd(usage: AiUsage, at: Date | 'peak'): number {
  const p = DEEPSEEK_FLASH_PRICE;
  const total = usage.cacheHitTokens * p.cacheHit + usage.cacheMissTokens * p.cacheMiss + usage.outputTokens * p.output;
  return Math.ceil(total / (at === 'peak' || isDeepSeekPeak(at) ? 1_000_000 : 2_000_000));
}

