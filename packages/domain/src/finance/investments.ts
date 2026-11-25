// Investimentos: ativos e movimentos (aporte, resgate, rendimento, cotação manual) e as contas puras da posição.
// Ações, FIIs e cripto têm cotação automática: valor = cotas × último preço (ver `quotes`); os demais usam a
// cotação manual. Dinheiro em centavos; quantidade em unidades × 10⁸; preço em R$ × 10⁸ (contas em BigInt).
import { z } from 'zod';

import { baseEntitySchema, isAlive } from '../core/index.ts';
import { SYMBOL_PATTERNS, type QuoteSource } from '../quotes/index.ts';
import { isoDateSchema, localDateOf, type IsoDate } from './calendar.ts';
import { build, issue, patch, singleLine } from './model.ts';
import { centsSchema } from './money.ts';

export const ASSET_KINDS = ['fixed_income', 'treasury', 'stocks', 'reits', 'funds', 'savings', 'crypto', 'other'] as const;
export const MOVEMENT_KINDS = ['contribution', 'withdrawal', 'income', 'quote'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  fixed_income: 'Renda fixa',
  treasury: 'Tesouro Direto',
  stocks: 'Ações',
  reits: 'FIIs',
  funds: 'Fundos',
  savings: 'Poupança',
  crypto: 'Cripto',
  other: 'Outro',
};

export const ASSET_NAME_MAX = 120;
export const ASSET_INSTITUTION_MAX = 80;
export const ASSET_NOTES_MAX = 500;
export const MOVEMENT_NOTES_MAX = 200;
/** Quantidade guardada em unidades × 10⁸ (frações de cripto). */
export const QTY_SCALE = 100_000_000;

const SOURCE_OF: Partial<Record<AssetKind, QuoteSource>> = { stocks: 'brapi', reits: 'brapi', crypto: 'coingecko' };

export function quoteSourceOf(kind: AssetKind): QuoteSource | null {
  return SOURCE_OF[kind] ?? null;
}
export const isAutoQuoted = (kind: AssetKind) => quoteSourceOf(kind) !== null;

/** Com movimentos, o tipo só troca dentro da mesma fonte (Ações ↔ FIIs; manuais entre si). */
export function canChangeKind(from: AssetKind, to: AssetKind, hasMovements: boolean): boolean {
  return from === to || !hasMovements || quoteSourceOf(from) === quoteSourceOf(to);
}

// ---------- Ativos ----------

/** Aceita ISO e o formato que o Postgres manda pelo sync ("2026-11-25 13:07:00+00"). */
export function parseTimestamp(s: string): number {
  return Date.parse(s.trim().replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
}
const timestampSchema = z.string().refine((s) => !Number.isNaN(parseTimestamp(s)), 'Data e hora inválidas');
const nonNegativeInt = z.number().int().refine((v) => Number.isSafeInteger(v) && v >= 0, 'Valor inválido');
const positiveInt = z.number().int().refine((v) => Number.isSafeInteger(v) && v > 0, 'Valor inválido');

const assetFields = z.object({
  name: singleLine(ASSET_NAME_MAX).min(1),
  kind: z.enum(ASSET_KINDS),
  institution: singleLine(ASSET_INSTITUTION_MAX),
  notes: z.string().trim().max(ASSET_NOTES_MAX),
  quote_symbol: z.string().trim().nullable(),
  last_price_e8: nonNegativeInt.nullable(),
  last_price_at: timestampSchema.nullable(),
});

const assetData = assetFields.superRefine((a, ctx) => {
  const source = quoteSourceOf(a.kind);
  if (source === null) {
    if (a.quote_symbol !== null || a.last_price_e8 !== null || a.last_price_at !== null) issue(ctx, 'Só ativo com cotação automática tem código e preço');
  } else if (a.quote_symbol === null || !SYMBOL_PATTERNS[source].test(a.quote_symbol)) {
    issue(ctx, 'Código inválido');
  }
  if ((a.last_price_e8 === null) !== (a.last_price_at === null)) issue(ctx, 'Preço precisa da data');
});

export const investmentAssetSchema = baseEntitySchema.extend(assetFields.shape);
export type InvestmentAsset = z.infer<typeof investmentAssetSchema>;
export type InvestmentAssetDraft = Partial<z.input<typeof assetFields>> & Pick<z.input<typeof assetFields>, 'name' | 'kind'>;
export type InvestmentAssetPatch = Partial<z.input<typeof assetFields>>;

const ASSET_DEFAULTS = { institution: '', notes: '', quote_symbol: null, last_price_e8: null, last_price_at: null };

export function newInvestmentAsset(draft: InvestmentAssetDraft, userId: string, clock?: () => Date): InvestmentAsset {
  return build(assetData, ASSET_DEFAULTS, draft, userId, clock);
}
export function applyInvestmentAssetPatch(asset: InvestmentAsset, changes: InvestmentAssetPatch, clock?: () => Date): InvestmentAsset {
  return patch(assetData, asset, changes, clock);
}

// ---------- Movimentos ----------

const movementFields = z.object({
  asset_id: z.uuid(),
  kind: z.enum(MOVEMENT_KINDS),
  amount_cents: centsSchema,
  quantity: positiveInt.nullable(),
  date: isoDateSchema,
  account_id: z.uuid().nullable(),
  notes: singleLine(MOVEMENT_NOTES_MAX),
});

const movementData = movementFields.superRefine((m, ctx) => {
  if (m.kind === 'income' ? m.amount_cents === 0 : m.amount_cents <= 0) issue(ctx, 'Valor inválido');
  const flow = m.kind === 'contribution' || m.kind === 'withdrawal';
  if (!flow && m.account_id !== null) issue(ctx, 'Só aporte e resgate têm conta');
  if (!flow && m.quantity !== null) issue(ctx, 'Só aporte e resgate têm quantidade');
});

export const investmentMovementSchema = baseEntitySchema.extend(movementFields.shape);
export type InvestmentMovement = z.infer<typeof investmentMovementSchema>;
export type InvestmentMovementDraft = Partial<z.input<typeof movementFields>> &
  Pick<z.input<typeof movementFields>, 'asset_id' | 'kind' | 'amount_cents' | 'date'>;
export type InvestmentMovementPatch = Partial<Omit<z.input<typeof movementFields>, 'asset_id'>>;

const MOVEMENT_DEFAULTS = { quantity: null, account_id: null, notes: '' };

export function newInvestmentMovement(draft: InvestmentMovementDraft, userId: string, clock?: () => Date): InvestmentMovement {
  return build(movementData, MOVEMENT_DEFAULTS, draft, userId, clock);
}
export function applyInvestmentMovementPatch(m: InvestmentMovement, changes: InvestmentMovementPatch, clock?: () => Date): InvestmentMovement {
  return patch(movementData, m, changes, clock);
}

// ---------- Contas ----------

const E14 = 100_000_000_000_000n;

/** Centavos de `units` (× 10⁸) a `priceE8` (R$ × 10⁸), arredondando meio para cima. */
export function unitsValue(unitsE8: number, priceE8: number): number {
  const p = BigInt(unitsE8) * BigInt(Math.round(priceE8));
  const neg = p < 0n;
  const abs = neg ? -p : p;
  const cents = Number((abs + E14 / 2n) / E14);
  return neg ? -cents : cents;
}

/** Preço (R$ × 10⁸) pago por unidade num aporte/resgate. */
function unitPriceE8(amountCents: number, quantity: number): number {
  return Number((BigInt(amountCents) * E14) / BigInt(quantity));
}

export interface AssetPosition {
  invested: number;
  current: number;
  /** cotas × 10⁸ (null em ativo manual) */
  units: number | null;
  income: number;
  result: number;
  pct: number;
  closed: boolean;
  /** automático com preço; manual sempre true */
  hasPrice: boolean;
  lastQuoteDate: IsoDate | null;
  lastDate: IsoDate | null;
  firstDate: IsoDate | null;
  /** valor após cada movimento, mais o ponto de hoje */
  series: { date: IsoDate; value: number }[];
}

const KIND_RANK: Record<MovementKind, number> = { contribution: 0, income: 1, quote: 2, withdrawal: 3 };

/** Ordem dos movimentos: data, instante de criação e, no mesmo instante, aporte → rendimento → cotação → resgate. */
export const chronological = (a: InvestmentMovement, b: InvestmentMovement) =>
  a.date !== b.date
    ? a.date < b.date ? -1 : 1
    : a.created_at !== b.created_at
      ? a.created_at < b.created_at ? -1 : 1
      : KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.id < b.id ? -1 : 1);

export function assetPosition(asset: InvestmentAsset, movements: readonly InvestmentMovement[], today: IsoDate, excludeId?: string): AssetPosition {
  const ms = movements.filter((m) => m.asset_id === asset.id && isAlive(m) && m.id !== excludeId).sort(chronological);
  const auto = isAutoQuoted(asset.kind);
  let invested = 0;
  let contributed = 0;
  let income = 0;
  let manualValue = 0;
  let units = 0;
  let paidPrice = 0;
  let lastQuoteDate: IsoDate | null = null;
  const series: AssetPosition['series'] = [];

  for (const m of ms) {
    if (m.kind === 'contribution') {
      invested += m.amount_cents;
      contributed += m.amount_cents;
      manualValue += m.amount_cents;
    } else if (m.kind === 'withdrawal') {
      invested -= m.amount_cents;
      manualValue -= m.amount_cents;
    } else if (m.kind === 'income') {
      income += m.amount_cents;
      manualValue += m.amount_cents;
    } else {
      manualValue = m.amount_cents;
      lastQuoteDate = m.date;
    }
    if (auto && m.quantity !== null) {
      units += m.kind === 'withdrawal' ? -m.quantity : m.quantity;
      paidPrice = unitPriceE8(m.amount_cents, m.quantity);
    }
    series.push({ date: m.date, value: auto ? unitsValue(units, paidPrice) : manualValue });
  }

  const hasPrice = !auto || asset.last_price_e8 !== null;
  // Resgate acima do valor (manual) não deixa saldo negativo: o ativo fica encerrado.
  const current = !auto ? Math.max(manualValue, 0) : units <= 0 ? 0 : hasPrice ? unitsValue(units, asset.last_price_e8!) : Math.max(invested, 0);
  const closed = ms.length > 0 && (auto ? units <= 0 : manualValue <= 0);
  const result = auto ? current - invested + income : current - invested;
  const base = closed || invested <= 0 ? contributed : invested;
  if (ms.length) series.push({ date: today, value: current });

  return {
    invested,
    current,
    units: auto ? units : null,
    income,
    result,
    pct: base > 0 ? result / base : 0,
    closed,
    hasPrice,
    lastQuoteDate,
    lastDate: ms.at(-1)?.date ?? null,
    firstDate: ms[0]?.date ?? null,
    series,
  };
}

export interface PositionedAsset {
  asset: InvestmentAsset;
  position: AssetPosition;
}
export interface PortfolioGroup {
  kind: AssetKind;
  total: number;
  /** fração do patrimônio (0–1) */
  share: number;
  assets: PositionedAsset[];
}
export interface Portfolio {
  total: number;
  invested: number;
  result: number;
  pct: number;
  /** data do lançamento ou cotação mais recente dos abertos */
  updated: IsoDate | null;
  groups: PortfolioGroup[];
  closed: PositionedAsset[];
}

const maxDate = (dates: (IsoDate | null)[]) => dates.filter((d): d is IsoDate => d !== null).sort().at(-1) ?? null;

export function portfolio(assets: readonly InvestmentAsset[], movements: readonly InvestmentMovement[], today: IsoDate): Portfolio {
  const all = assets.filter(isAlive).map((asset) => ({ asset, position: assetPosition(asset, movements, today) }));
  const open = all.filter((x) => !x.position.closed);
  const total = open.reduce((s, x) => s + x.position.current, 0);
  const invested = open.reduce((s, x) => s + x.position.invested, 0);
  const result = open.reduce((s, x) => s + x.position.result, 0);
  const byValue = (a: PositionedAsset, b: PositionedAsset) => b.position.current - a.position.current || a.asset.name.localeCompare(b.asset.name, 'pt-BR');
  const groups = ASSET_KINDS.map((kind) => {
    const items = open.filter((x) => x.asset.kind === kind).sort(byValue);
    const sum = items.reduce((s, x) => s + x.position.current, 0);
    return { kind, total: sum, share: total > 0 ? sum / total : 0, assets: items };
  })
    .filter((g) => g.assets.length > 0)
    .sort((a, b) => b.total - a.total);
  return {
    total,
    invested,
    result,
    pct: invested > 0 ? result / invested : 0,
    updated: maxDate(open.flatMap((x) => [x.position.lastDate, x.asset.last_price_at ? localDateOf(x.asset.last_price_at) : null])),
    groups,
    closed: all.filter((x) => x.position.closed).sort((a, b) => ((b.position.lastDate ?? '') < (a.position.lastDate ?? '') ? -1 : 1)),
  };
}

/** Efeito de um aporte/resgate numa conta de Finanças: + entra, − sai. */
export interface AccountFlow {
  key: string;
  account_id: string;
  amount_cents: number;
  date: IsoDate;
  description: string;
}

export function accountFlows(assets: readonly InvestmentAsset[], movements: readonly InvestmentMovement[]): AccountFlow[] {
  const names = new Map(assets.filter(isAlive).map((a) => [a.id, a.name]));
  return movements
    .filter((m) => isAlive(m) && m.account_id !== null && names.has(m.asset_id) && (m.kind === 'contribution' || m.kind === 'withdrawal'))
    .sort(chronological)
    .map((m) => ({
      key: m.id,
      account_id: m.account_id!,
      amount_cents: m.kind === 'contribution' ? -m.amount_cents : m.amount_cents,
      date: m.date,
      description: `${m.kind === 'contribution' ? 'Aporte' : 'Resgate'} · ${names.get(m.asset_id)}`,
    }));
}
