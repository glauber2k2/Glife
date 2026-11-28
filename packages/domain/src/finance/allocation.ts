// Alocação da carteira por grupo (rosca, metas, ranking por tipo) e metas do usuário (% inteiros que somam 100).
// A lista e o detalhe continuam mostrando o tipo do ativo (8 tipos); os grupos juntam os de renda fixa.
import { z } from "zod";

import type { BaseEntity } from "../core/index.ts";
import type { AssetKind, Portfolio } from "./investments.ts";

export const ALLOCATION_GROUPS = ["fixed_income", "stocks", "reits", "funds", "crypto", "other"] as const;
export type AllocationGroup = (typeof ALLOCATION_GROUPS)[number];

export const ALLOCATION_LABELS: Record<AllocationGroup, string> = {
  fixed_income: "Renda fixa",
  stocks: "Ações",
  reits: "FIIs",
  funds: "Fundos",
  crypto: "Cripto",
  other: "Outros",
};

const GROUP_OF: Record<AssetKind, AllocationGroup> = {
  fixed_income: "fixed_income",
  treasury: "fixed_income",
  savings: "fixed_income",
  stocks: "stocks",
  reits: "reits",
  funds: "funds",
  crypto: "crypto",
  other: "other",
};
export const groupOf = (kind: AssetKind): AllocationGroup => GROUP_OF[kind];

export type Targets = Record<AllocationGroup, number>;
export const TARGETS_SUM_MESSAGE = "As metas precisam somar 100%";

const pct = z.number().int().min(0).max(100);
export const targetsSchema = z
  .object(Object.fromEntries(ALLOCATION_GROUPS.map((g) => [g, pct])) as Record<AllocationGroup, typeof pct>)
  .refine((t) => targetsSum(t) === 100, TARGETS_SUM_MESSAGE);

/** Linha sincronizada (`investment_targets`): uma viva por usuário, `id = user_id`. */
export type InvestmentTargetsRow = BaseEntity & Targets;

export const targetsSum = (t: Partial<Targets>) => ALLOCATION_GROUPS.reduce((s, g) => s + (t[g] ?? 0), 0);
export const targetsOf = (row: InvestmentTargetsRow): Targets =>
  Object.fromEntries(ALLOCATION_GROUPS.map((g) => [g, row[g] ?? 0])) as Targets;

export interface AllocationSlice {
  group: AllocationGroup;
  total: number;
  /** fração do patrimônio (0–1) */
  share: number;
  /** meta como fração (0–1); null sem metas */
  target: number | null;
  /** atual − meta, em pontos percentuais; null sem metas */
  diff: number | null;
}

function totals(p: Portfolio): Record<AllocationGroup, number> {
  const out = Object.fromEntries(ALLOCATION_GROUPS.map((g) => [g, 0])) as Record<AllocationGroup, number>;
  for (const g of p.groups) out[groupOf(g.kind)] += g.total;
  return out;
}

/** Fatias na ordem fixa de ALLOCATION_GROUPS (a mesma das cores). */
export function allocation(p: Portfolio, targets: Targets | null): AllocationSlice[] {
  const t = totals(p);
  return ALLOCATION_GROUPS.map((group) => {
    const share = p.total > 0 ? t[group] / p.total : 0;
    const target = targets ? targets[group] / 100 : null;
    return { group, total: t[group], share, target, diff: target === null ? null : (share - target) * 100 };
  });
}

/** Quanto aportar em cada grupo (centavos) para chegar às metas sem vender nada. Grupos já acima ficam de fora. */
export function contributionToReach(p: Portfolio, targets: Targets): Partial<Record<AllocationGroup, number>> {
  const t = totals(p);
  const withTarget = ALLOCATION_GROUPS.filter((g) => targets[g] > 0);
  // Patrimônio final: o menor em que nenhum grupo com meta passa dela.
  const finalTotal = Math.max(p.total, ...withTarget.map((g) => Math.ceil(t[g] / (targets[g] / 100))));
  const out: Partial<Record<AllocationGroup, number>> = {};
  for (const g of withTarget) {
    const need = Math.round((finalTotal * targets[g]) / 100) - t[g];
    if (need > 0) out[g] = need;
  }
  return out;
}
