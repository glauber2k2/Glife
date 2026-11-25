// Textos de Investimentos (pt-BR, sem Intl, como em format.ts): percentuais, quantidade de cotas e hora da cotação.
import { QTY_SCALE, parseTimestamp } from '@glife/domain/finance';

const MINUS = '−';
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pad2 = (n: number) => String(n).padStart(2, '0');

function fixed(value: number, decimals: number): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split('.');
  return frac ? `${group(int!)},${frac}` : group(int!);
}

/** "+9,16%" · "−19,69%". */
export const pctSigned = (ratio: number) => `${ratio < 0 ? MINUS : '+'}${fixed(ratio * 100, 2)}%`;

/** "41,2%" (participação no patrimônio). */
export const shareText = (ratio: number) => `${fixed(ratio * 100, 1)}%`;

/** Cotas × 10⁸ → "100", "0,00012345", "1.234.567,5". */
export function quantityText(unitsE8: number): string {
  const int = Math.floor(unitsE8 / QTY_SCALE);
  const frac = String(unitsE8 % QTY_SCALE)
    .padStart(8, '0')
    .replace(/0+$/, '');
  return frac ? `${group(String(int))},${frac}` : group(String(int));
}

/** "100", "0,5", "1.234,5" ou "0.5" → cotas × 10⁸; vazio, zero, mais de 8 casas ou texto → null. */
export function parseQuantity(text: string): number | null {
  const t = text.trim().replace(/\s/g, '');
  if (!/^[\d.,]+$/.test(t)) return null;
  // Vírgula é o decimal; sem vírgula, um único ponto seguido de 1–8 dígitos (e não 3) também é.
  let normalized: string;
  if (t.includes(',')) normalized = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d+\.\d{1,8}$/.test(t) && !/^\d{1,3}\.\d{3}$/.test(t)) normalized = t;
  else normalized = t.replace(/\./g, '');
  const m = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!m) return null;
  const frac = m[2] ?? '';
  if (frac.length > 8) return null;
  const units = Number(m[1]) * QTY_SCALE + Number(frac.padEnd(8, '0') || '0');
  return Number.isSafeInteger(units) && units > 0 ? units : null;
}

/** Horário da cotação no fuso do aparelho: "25/11 09:07". */
export function dayTime(timestamp: string): string {
  const d = new Date(parseTimestamp(timestamp));
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
