// Dinheiro no Glife: sempre centavos inteiros (nunca float). Formatação e leitura em BRL feitas à mão,
// sem Intl, para dar o mesmo resultado no Hermes (Android), no navegador e no Deno.
import { z } from 'zod';

export type Cents = number;

/** Limite de parcelas aceito em compras parceladas. */
export const INSTALLMENTS_MAX = 120;

export const centsSchema = z.number().int().refine(Number.isSafeInteger, 'Valor fora do intervalo seguro');

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError('Valor em centavos deve ser inteiro');
}

export interface FormatBRLOptions {
  /** Mostra "+" em valores positivos (o zero nunca leva sinal). */
  signed?: boolean;
  /** Inclui "R$ " (padrão: true). */
  symbol?: boolean;
}

/** 123456 → "R$ 1.234,56"; -1999 → "-R$ 19,99". */
export function formatBRL(cents: Cents, options: FormatBRLOptions = {}): string {
  assertCents(cents);
  const { signed = false, symbol = true } = options;
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (abs % 100).toString().padStart(2, '0');
  const sign = cents < 0 ? '-' : signed && cents > 0 ? '+' : '';
  return `${sign}${symbol ? 'R$ ' : ''}${reais},${centavos}`;
}

// Sinal antes ou depois do "R$"; milhar com ponto (grupos de 3) ou sem separador; até 2 casas após a vírgula.
const BRL_PATTERN = /^(-)?\s*(?:r\$)?\s*(-)?\s*(\d{1,3}(?:\.\d{3})+|\d+)?(?:,(\d{1,2}))?$/i;

/** Lê o que a pessoa digitou ("R$ 1.234,56", "12,5", "-19,99") em centavos; texto inválido → null. */
export function parseBRL(input: string): Cents | null {
  const match = BRL_PATTERN.exec(input.trim());
  if (!match) return null;
  const [, minusBefore, minusAfter, intPart, decPart] = match;
  if (minusBefore && minusAfter) return null;
  if (intPart === undefined && decPart === undefined) return null;
  const reais = Number((intPart ?? '0').replaceAll('.', ''));
  const centavos = Number((decPart ?? '0').padEnd(2, '0'));
  const abs = reais * 100 + centavos;
  if (!Number.isSafeInteger(abs)) return null;
  return minusBefore || minusAfter ? -abs : abs;
}

/** Divide o total em parcelas sem perder centavo; a sobra vai para as primeiras. */
export function splitInstallments(total: Cents, count: number): Cents[] {
  assertCents(total);
  if (!Number.isInteger(count) || count < 1 || count > INSTALLMENTS_MAX) {
    throw new RangeError(`Número de parcelas deve ser inteiro entre 1 e ${INSTALLMENTS_MAX}`);
  }
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / count);
  const remainder = abs % count;
  return Array.from({ length: count }, (_, i) => sign * (base + (i < remainder ? 1 : 0)));
}

/** Soma valores em centavos, recusando floats e estouro do intervalo seguro. */
export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
    if (!Number.isSafeInteger(total)) throw new RangeError('Soma fora do intervalo seguro');
  }
  return total;
}
