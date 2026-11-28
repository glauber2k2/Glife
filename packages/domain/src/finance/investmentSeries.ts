// Séries diárias para os gráficos de Investimentos (um ponto por dia corrido desde o primeiro movimento).
// Automático: cotas do dia × fechamento do dia (sem fechamento: o último conhecido; antes do primeiro: o preço pago).
// Manual: valor após os movimentos, interpolado até a cotação seguinte (aporte, resgate e rendimento são degraus).
// O ponto de hoje bate com `assetPosition` (usa `last_price_e8`), para o gráfico terminar no patrimônio da tela.
import { isAlive } from "../core/index.ts";
import type { PricePoint } from "../quotes/index.ts";
import { addDays, type IsoDate } from "./calendar.ts";
import {
  assetPosition,
  chronological,
  isAutoQuoted,
  unitsValue,
  type InvestmentAsset,
  type InvestmentMovement,
  type Portfolio,
} from "./investments.ts";

const E14 = 100_000_000_000_000n;

export type PriceBook = ReadonlyMap<string, readonly PricePoint[]>;
export interface DailyPoint {
  date: IsoDate;
  value: number;
  invested: number;
}

export const PERIOD_DAYS = { "1M": 31, "6M": 183, "1A": 366, Tudo: Infinity } as const;
export type Period = keyof typeof PERIOD_DAYS;

function days(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function assetDaily(
  asset: InvestmentAsset,
  movements: readonly InvestmentMovement[],
  prices: readonly PricePoint[],
  today: IsoDate,
): DailyPoint[] {
  const ms = movements.filter((m) => m.asset_id === asset.id && isAlive(m)).sort(chronological);
  if (!ms.length || ms[0]!.date > today) return [];
  const auto = isAutoQuoted(asset.kind);
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: DailyPoint[] = [];
  let i = 0; // próximo movimento
  let p = 0; // próximo fechamento
  let units = 0;
  let invested = 0;
  let manual = 0;
  let paidE8 = 0;
  let closeE8: number | null = null;

  for (const day of days(ms[0]!.date, today)) {
    while (i < ms.length && ms[i]!.date <= day) {
      const m = ms[i++]!;
      if (m.kind === "contribution") invested += m.amount_cents;
      if (m.kind === "withdrawal") invested -= m.amount_cents;
      if (m.kind === "quote") manual = m.amount_cents;
      else manual += m.kind === "withdrawal" ? -m.amount_cents : m.amount_cents;
      if (auto && m.quantity !== null) {
        units += m.kind === "withdrawal" ? -m.quantity : m.quantity;
        paidE8 = Number((BigInt(m.amount_cents) * E14) / BigInt(m.quantity));
      }
    }
    while (p < sorted.length && sorted[p]!.date <= day) closeE8 = sorted[p++]!.closeE8;

    let value: number;
    if (auto) value = units <= 0 ? 0 : unitsValue(units, closeE8 ?? paidE8);
    else {
      value = manual;
      // Interpola até a próxima cotação manual (se a próxima coisa a acontecer for uma cotação).
      const next = ms[i];
      if (next && next.kind === "quote" && i > 0) {
        const prevDate = ms[i - 1]!.date;
        const span = daysBetween(prevDate, next.date);
        const done = daysBetween(prevDate, day);
        if (span > 0) value = Math.round(manual + ((next.amount_cents - manual) * done) / span);
      }
      value = Math.max(value, 0);
    }
    out.push({ date: day, value, invested });
  }
  const last = out.at(-1)!;
  if (last.date === today) last.value = assetPosition(asset, movements, today).current;
  return out;
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Soma dos ativos abertos da carteira, dia a dia, do primeiro movimento até hoje. */
export function portfolioDaily(
  p: Portfolio,
  movements: readonly InvestmentMovement[],
  book: PriceBook,
  today: IsoDate,
): DailyPoint[] {
  const totals = new Map<IsoDate, DailyPoint>();
  for (const { asset } of p.groups.flatMap((g) => g.assets)) {
    for (const pt of assetDaily(asset, movements, book.get(asset.id) ?? [], today)) {
      const t = totals.get(pt.date) ?? { date: pt.date, value: 0, invested: 0 };
      t.value += pt.value;
      t.invested += pt.invested;
      totals.set(pt.date, t);
    }
  }
  return [...totals.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Pontos a partir de `hoje − dias do período` (Tudo = todos). */
export function slicePeriod<T extends { date: IsoDate }>(s: readonly T[], period: Period, today: IsoDate): T[] {
  const n = PERIOD_DAYS[period];
  if (!Number.isFinite(n)) return [...s];
  const from = addDays(today, -n);
  return s.filter((x) => x.date >= from);
}
