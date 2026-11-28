// Preço do deepseek-flash (página oficial "Models & Pricing", consultada em 27/11/2026) e conversão para o teto em
// reais. Contas em inteiros (micro-dólares e centavos) e sempre arredondando para cima: o teto nunca subestima.

export interface AiUsage {
  cacheHitTokens: number;
  cacheMissTokens: number;
  outputTokens: number;
}

/** Micro-dólares por milhão de tokens no horário de pico ($0.006 / $0.30 / $1.20); fora do pico é a metade. */
export const DEEPSEEK_FLASH_PRICE = { cacheHit: 6_000, cacheMiss: 300_000, output: 1_200_000 } as const;

export const AI_DEFAULT_CAP_CENTS = 2000;

/** Pico: 01:00–04:00 e 06:00–10:00 UTC, segunda a sexta. Feriados chineses contam como pico (lado seguro). */
export function isDeepSeekPeak(at: Date): boolean {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = at.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

export function costMicroUsd(usage: AiUsage, at: Date): number {
  const p = DEEPSEEK_FLASH_PRICE;
  const total = usage.cacheHitTokens * p.cacheHit + usage.cacheMissTokens * p.cacheMiss + usage.outputTokens * p.output;
  return Math.ceil(total / (isDeepSeekPeak(at) ? 1_000_000 : 2_000_000));
}

export function microUsdToBrlCents(microUsd: number, usdBrl: number): number {
  const rate = Math.round(usdBrl * 10_000); // cotação em décimos de milésimo, para a conta ficar inteira
  return Math.ceil((microUsd * rate) / 100_000_000);
}

/** Cotação do secret (`"5.40"` ou `"5,40"`). Fora de (0, 100] ou ilegível: null. */
export function parseUsdBrl(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const text = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return n > 0 && n <= 100 ? n : null;
}
