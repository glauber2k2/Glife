// Estatísticas de um ativo a partir do histórico diário disponível (grátis: 3 meses na B3, 1 ano em cripto,
// crescendo com o histórico próprio). Cada número vale para a janela informada; com menos de 20 pregões, nada de mercado.
import { isAlive } from "../core/index.ts";
import type { PricePoint } from "../quotes/index.ts";
import { addDays, type IsoDate } from "./calendar.ts";
import { isAutoQuoted, type AssetPosition, type InvestmentAsset, type InvestmentMovement } from "./investments.ts";

export const STATS_MIN_POINTS = 20;
const YEAR_DAYS = 365;
const E14 = 100_000_000_000_000n;

export interface StatWindow {
  from: IsoDate;
  to: IsoDate;
  /** pregões (pontos) na janela */
  days: number;
}

export type Oscillation = "low" | "medium" | "high";

export interface AssetStats {
  window: StatWindow | null;
  periodReturn: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  vsAverage: number | null;
  income12m: number;
  yieldOnCost: number | null;
  oscillation: Oscillation | null;
}

const oscillationOf = (v: number): Oscillation => (v < 0.1 ? "low" : v < 0.25 ? "medium" : "high");

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1));
}

export function assetStats(
  asset: InvestmentAsset,
  position: AssetPosition,
  movements: readonly InvestmentMovement[],
  prices: readonly PricePoint[],
  today: IsoDate,
): AssetStats {
  const yearAgo = addDays(today, -YEAR_DAYS);
  const income12m = movements
    .filter((m) => m.asset_id === asset.id && isAlive(m) && m.kind === "income" && m.date > yearAgo && m.date <= today)
    .reduce((s, m) => s + m.amount_cents, 0);
  const yieldOnCost = position.invested > 0 ? income12m / position.invested : null;

  let vsAverage: number | null = null;
  if (isAutoQuoted(asset.kind) && asset.last_price_e8 !== null && position.units && position.units > 0 && position.invested > 0) {
    const avgE8 = Number((BigInt(position.invested) * E14) / BigInt(position.units));
    vsAverage = avgE8 > 0 ? asset.last_price_e8 / avgE8 - 1 : null;
  }

  const pts = [...prices].filter((p) => p.date > yearAgo && p.date <= today && p.closeE8 > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (pts.length < STATS_MIN_POINTS)
    return { window: null, periodReturn: null, volatility: null, maxDrawdown: null, vsAverage, income12m, yieldOnCost, oscillation: null };

  const closes = pts.map((p) => p.closeE8);
  const returns = closes.slice(1).map((c, i) => c / closes[i]! - 1);
  const volatility = stdev(returns) * Math.sqrt(252);
  let peak = closes[0]!;
  let maxDrawdown = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    maxDrawdown = Math.min(maxDrawdown, c / peak - 1);
  }
  return {
    window: { from: pts[0]!.date, to: pts.at(-1)!.date, days: pts.length },
    periodReturn: closes.at(-1)! / closes[0]! - 1,
    volatility,
    maxDrawdown,
    vsAverage,
    income12m,
    yieldOnCost,
    oscillation: oscillationOf(volatility),
  };
}
