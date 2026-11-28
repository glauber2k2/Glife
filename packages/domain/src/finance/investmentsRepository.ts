// Repositório de investimentos, sobre o mesmo FinanceStore de finanças. Confere as regras que cruzam tabelas
// (conta viva e que não é cartão, quantidade só em ativo automático, cotas não negativas) e grava tudo ou nada.
import {
  RepositoryError,
  isAlive,
  parseOrThrow,
  restore,
  softDelete,
  stampNew,
  stampUpdate,
  type ErrorListener,
  type Listener,
  type Unsubscribe,
} from "../core/index.ts";
import { keyOf, type Quote } from "../quotes/index.ts";
import {
  targetsOf,
  targetsSchema,
  type InvestmentTargetsRow,
  type Targets,
} from "./allocation.ts";
import type { IsoDate } from "./calendar.ts";
import {
  applyInvestmentAssetPatch,
  applyInvestmentMovementPatch,
  assetPosition,
  canChangeKind,
  chronological,
  isAutoQuoted,
  newInvestmentAsset,
  newInvestmentMovement,
  parseTimestamp,
  quoteSourceOf,
  type InvestmentAsset,
  type InvestmentAssetDraft,
  type InvestmentAssetPatch,
  type InvestmentMovement,
  type InvestmentMovementDraft,
  type InvestmentMovementPatch,
} from "./investments.ts";
import type { FinanceStore, FinanceStoreReads } from "./repository.ts";

export interface InvestmentsSnapshot {
  /** ativos vivos, por nome */
  assets: InvestmentAsset[];
  /** movimentos vivos de ativos vivos, em ordem cronológica */
  movements: InvestmentMovement[];
  /** metas de alocação; null enquanto o usuário não definir */
  targets: Targets | null;
}

/** Saldo de quem já tem o investimento: vira o primeiro movimento. */
export interface AssetOpening {
  investedCents: number;
  /** manual: valor de hoje (vira uma cotação) */
  currentCents?: number;
  /** automático: cotas × 10⁸ (obrigatória) */
  quantity?: number;
  date: IsoDate;
}

export interface InvestmentsRepository {
  snapshot(): Promise<InvestmentsSnapshot>;
  watch(
    listener: Listener<InvestmentsSnapshot>,
    onError?: ErrorListener,
  ): Unsubscribe;
  createAsset(
    draft: InvestmentAssetDraft,
    opening?: AssetOpening,
  ): Promise<InvestmentAsset>;
  updateAsset(
    id: string,
    patch: InvestmentAssetPatch,
  ): Promise<InvestmentAsset>;
  /** Exclui o ativo com os movimentos (lógico). Devolve os ids dos movimentos que saíram junto, para desfazer. */
  removeAsset(id: string): Promise<string[]>;
  restoreAsset(id: string, movementIds: readonly string[]): Promise<void>;
  addMovement(draft: InvestmentMovementDraft): Promise<InvestmentMovement>;
  updateMovement(
    id: string,
    patch: InvestmentMovementPatch,
  ): Promise<InvestmentMovement>;
  removeMovement(id: string): Promise<void>;
  restoreMovement(id: string): Promise<void>;
  /** Resgata o valor atual (e todas as cotas, no automático). Automático sem cotação = `validation`. */
  close(id: string, date: IsoDate): Promise<InvestmentMovement>;
  /** Grava o último preço nos ativos vivos da mesma fonte e código, se a cotação for mais nova. Devolve quantos mudaram. */
  applyQuotes(quotes: readonly Quote[]): Promise<number>;
  getTargets(): Promise<Targets | null>;
  /** Grava as metas (inteiros 0–100 que somam 100); senão `validation` com "As metas precisam somar 100%". */
  setTargets(targets: Targets): Promise<Targets>;
}

export interface InvestmentsDeps {
  store: FinanceStore;
  userId: string;
  clock?: () => Date;
  guard: <T>(fn: () => Promise<T>) => Promise<T>;
}

const invalid = () => new RepositoryError("validation");
const notFound = () => new RepositoryError("not_found");
const byName = (a: InvestmentAsset, b: InvestmentAsset) =>
  a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) ||
  (a.id < b.id ? -1 : 1);
const today = (clock?: () => Date) =>
  (clock ?? (() => new Date()))().toISOString().slice(0, 10);

export function createInvestmentsRepository({
  store,
  userId,
  clock,
  guard,
}: InvestmentsDeps): InvestmentsRepository {
  async function alive<K extends "investment_assets" | "investment_movements">(
    db: FinanceStoreReads,
    table: K,
    id: string,
  ) {
    const row = await db.get(table, id);
    if (!row || row.deleted_at !== null) throw notFound();
    return row;
  }
  async function movementsOf(db: FinanceStoreReads, assetId: string) {
    return (await db.listAlive("investment_movements")).filter(
      (m) => m.asset_id === assetId,
    );
  }

  /** Cotas de um ativo automático não podem ficar negativas (sem `without`, com `m` no lugar da versão antiga). */
  async function checkUnits(
    db: FinanceStoreReads,
    asset: InvestmentAsset,
    m: InvestmentMovement | null,
    without: string,
  ) {
    if (!isAutoQuoted(asset.kind)) return;
    // Em ordem de data: um resgate não pode vir antes das cotas que ele resgata.
    const all = (await movementsOf(db, asset.id)).filter(
      (x) => x.id !== without,
    );
    let units = 0;
    for (const x of (m ? [...all, m] : all).sort(chronological)) {
      if (x.quantity === null) continue;
      units += x.kind === "withdrawal" ? -x.quantity : x.quantity;
      if (units < 0) throw invalid();
    }
  }

  /**
   * Regras do movimento que dependem do ativo, da conta e dos outros movimentos. A conta só é conferida quando muda
   * (`previous`): um movimento ligado a uma conta que depois foi excluída continua editável e restaurável.
   */
  async function check(
    db: FinanceStoreReads,
    m: InvestmentMovement,
    previous?: InvestmentMovement,
  ) {
    const asset = await db.get("investment_assets", m.asset_id);
    if (!asset || !isAlive(asset)) throw invalid();
    if (m.account_id !== null && m.account_id !== previous?.account_id) {
      const account = await db.get("accounts", m.account_id);
      if (!account || !isAlive(account) || account.kind === "credit_card")
        throw invalid();
    }
    const auto = isAutoQuoted(asset.kind);
    const flow = m.kind === "contribution" || m.kind === "withdrawal";
    if (auto && m.kind === "quote") throw invalid();
    if (auto && flow && m.quantity === null) throw invalid();
    if (!auto && m.quantity !== null) throw invalid();
    await checkUnits(db, asset, m, m.id);
  }

  async function snapshot(
    db: FinanceStoreReads = store,
  ): Promise<InvestmentsSnapshot> {
    const [assets, movements, targets] = await Promise.all([
      db.listAlive("investment_assets"),
      db.listAlive("investment_movements"),
      targetsRow(db),
    ]);
    const ids = new Set(assets.map((a) => a.id));
    return {
      assets: assets.sort(byName),
      movements: movements
        .filter((m) => ids.has(m.asset_id))
        .sort(chronological),
      targets: targets ? targetsOf(targets) : null,
    };
  }

  /** A meta viva mais recente (deve haver uma só). */
  async function targetsRow(db: FinanceStoreReads) {
    return (
      (await db.listAlive("investment_targets")).sort((a, b) =>
        a.updated_at < b.updated_at ? 1 : -1,
      )[0] ?? null
    );
  }

  const repo: InvestmentsRepository = {
    snapshot: () => guard(() => snapshot()),
    watch: (listener, onError) => {
      let active = true;
      const fail = (e: unknown) =>
        onError?.(
          e instanceof RepositoryError
            ? e
            : new RepositoryError("unavailable", { cause: e }),
        );
      const stop = store.watchInvestments(() => {
        void snapshot().then((s) => active && listener(s), fail);
      }, fail);
      return () => {
        active = false;
        stop();
      };
    },
    createAsset: (draft, opening) =>
      guard(() =>
        store.transaction(async (db) => {
          const asset = newInvestmentAsset(draft, userId, clock);
          await db.put("investment_assets", asset);
          if (opening) {
            const base = {
              asset_id: asset.id,
              date: opening.date,
              notes: "Saldo inicial",
            };
            const auto = isAutoQuoted(asset.kind);
            const contribution = newInvestmentMovement(
              {
                ...base,
                kind: "contribution",
                amount_cents: opening.investedCents,
                quantity: auto ? (opening.quantity ?? null) : null,
              },
              userId,
              clock,
            );
            await check(db, contribution);
            await db.put("investment_movements", contribution);
            if (
              !auto &&
              opening.currentCents !== undefined &&
              opening.currentCents > 0
            ) {
              const quote = newInvestmentMovement(
                {
                  asset_id: asset.id,
                  date: opening.date,
                  kind: "quote",
                  amount_cents: opening.currentCents,
                },
                userId,
                clock,
              );
              await db.put("investment_movements", quote);
            }
          }
          return asset;
        }),
      ),
    updateAsset: (id, changes) =>
      guard(() =>
        store.transaction(async (db) => {
          const current = await alive(db, "investment_assets", id);
          const hasMovements = (await movementsOf(db, id)).length > 0;
          if (
            changes.kind !== undefined &&
            !canChangeKind(current.kind, changes.kind, hasMovements)
          )
            throw invalid();
          // Trocou a fonte ou o código: o preço antigo não vale mais.
          const nextKind = changes.kind ?? current.kind;
          const symbolChanged =
            changes.quote_symbol !== undefined &&
            changes.quote_symbol !== current.quote_symbol;
          const sourceChanged =
            quoteSourceOf(nextKind) !== quoteSourceOf(current.kind);
          const reset =
            (symbolChanged || sourceChanged) &&
            changes.last_price_e8 === undefined
              ? { last_price_e8: null, last_price_at: null }
              : {};
          const asset = applyInvestmentAssetPatch(
            current,
            { ...changes, ...reset },
            clock,
          );
          await db.put("investment_assets", asset);
          return asset;
        }),
      ),
    removeAsset: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const asset = await alive(db, "investment_assets", id);
          const movements = await movementsOf(db, id);
          for (const m of movements)
            await db.put("investment_movements", softDelete(m, clock));
          await db.put("investment_assets", softDelete(asset, clock));
          return movements.map((m) => m.id);
        }),
      ),
    restoreAsset: (id, movementIds) =>
      guard(() =>
        store.transaction(async (db) => {
          const asset = await db.get("investment_assets", id);
          if (!asset) throw notFound();
          await db.put("investment_assets", restore(asset, clock));
          for (const mid of movementIds) {
            const m = await db.get("investment_movements", mid);
            if (m) await db.put("investment_movements", restore(m, clock));
          }
        }),
      ),
    addMovement: (draft) =>
      guard(() =>
        store.transaction(async (db) => {
          const m = newInvestmentMovement(draft, userId, clock);
          await check(db, m);
          await db.put("investment_movements", m);
          return m;
        }),
      ),
    updateMovement: (id, changes) =>
      guard(() =>
        store.transaction(async (db) => {
          if ("asset_id" in changes) throw invalid();
          const current = await alive(db, "investment_movements", id);
          const m = applyInvestmentMovementPatch(current, changes, clock);
          await check(db, m, current);
          await db.put("investment_movements", m);
          return m;
        }),
      ),
    removeMovement: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const m = await alive(db, "investment_movements", id);
          const asset = await db.get("investment_assets", m.asset_id);
          // Excluir o aporte que sustenta um resgate deixaria as cotas negativas: exclua o resgate antes.
          if (asset && isAlive(asset)) await checkUnits(db, asset, null, m.id);
          await db.put("investment_movements", softDelete(m, clock));
        }),
      ),
    restoreMovement: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const m = await db.get("investment_movements", id);
          if (!m) throw notFound();
          const back = restore(m, clock);
          await check(db, back, m);
          await db.put("investment_movements", back);
        }),
      ),
    close: (id, date) =>
      guard(() =>
        store.transaction(async (db) => {
          const asset = await alive(db, "investment_assets", id);
          const pos = assetPosition(
            asset,
            await movementsOf(db, id),
            today(clock),
          );
          const auto = isAutoQuoted(asset.kind);
          if (pos.closed || pos.current <= 0 || (auto && !pos.hasPrice))
            throw invalid();
          const m = newInvestmentMovement(
            {
              asset_id: id,
              kind: "withdrawal",
              amount_cents: pos.current,
              quantity: auto ? pos.units : null,
              date,
              notes: "Encerramento",
            },
            userId,
            clock,
          );
          await check(db, m);
          await db.put("investment_movements", m);
          return m;
        }),
      ),
    getTargets: () =>
      guard(async () => {
        const row = await targetsRow(store);
        return row ? targetsOf(row) : null;
      }),
    setTargets: (input) =>
      guard(() =>
        store.transaction(async (db) => {
          const targets = parseOrThrow(targetsSchema, input) as Targets;
          const current = await targetsRow(db);
          const row: InvestmentTargetsRow = current
            ? stampUpdate(current, targets, clock)
            : { ...stampNew(targets, userId, clock), id: userId };
          await db.put("investment_targets", row);
          return targetsOf(row);
        }),
      ),
    applyQuotes: (quotes) =>
      guard(() =>
        store.transaction(async (db) => {
          const byKey = new Map(quotes.map((q) => [keyOf(q), q]));
          let changed = 0;
          for (const asset of await db.listAlive("investment_assets")) {
            const source = quoteSourceOf(asset.kind);
            if (!source || asset.quote_symbol === null) continue;
            const q = byKey.get(keyOf({ source, symbol: asset.quote_symbol }));
            if (!q) continue;
            if (
              asset.last_price_at !== null &&
              parseTimestamp(q.quotedAt) <= parseTimestamp(asset.last_price_at)
            )
              continue;
            await db.put(
              "investment_assets",
              applyInvestmentAssetPatch(
                asset,
                { last_price_e8: q.priceE8, last_price_at: q.quotedAt },
                clock,
              ),
            );
            changed++;
          }
          return changed;
        }),
      ),
  };
  return repo;
}
