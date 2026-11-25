// Repositório da dieta sobre um RowStore. Registro só pode apontar para refeição do plano que existe (e é do dono).
import { RepositoryError, aliveRow, guardRules, repositoryErrorOf, restore, softDelete, type ErrorListener, type Listener, type RowStore, type RowStoreReads, type Unsubscribe } from '../core/index.ts';
import {
  applyMealLogPatch,
  applyMealPlanPatch,
  newMealLog,
  newMealPlanItem,
  type MealLog,
  type MealLogDraft,
  type MealLogPatch,
  type MealPlanDraft,
  type MealPlanItem,
  type MealPlanPatch,
} from './model.ts';

export type DietRows = {
  meal_plans: MealPlanItem;
  meals: MealLog;
};
export const DIET_TABLES = ['meal_plans', 'meals'] as const;

export interface DietSnapshot {
  plan: MealPlanItem[];
  logs: MealLog[];
}

export interface DietRepository {
  snapshot(): Promise<DietSnapshot>;
  watch(listener: Listener<DietSnapshot>, onError?: ErrorListener): Unsubscribe;
  getPlanItem(id: string): Promise<MealPlanItem>;
  createPlanItem(draft: MealPlanDraft): Promise<MealPlanItem>;
  updatePlanItem(id: string, patch: MealPlanPatch): Promise<MealPlanItem>;
  /** Tira do plano; os registros antigos ficam (sem a ligação só na exibição, a linha continua apontando). */
  removePlanItem(id: string): Promise<void>;
  restorePlanItem(id: string): Promise<void>;
  getLog(id: string): Promise<MealLog>;
  createLog(draft: MealLogDraft): Promise<MealLog>;
  updateLog(id: string, patch: MealLogPatch): Promise<MealLog>;
  removeLog(id: string): Promise<void>;
  restoreLog(id: string): Promise<void>;
}

export function createDietRepository(store: RowStore<DietRows>, userId: string, clock?: () => Date): DietRepository {
  const read = async (): Promise<DietSnapshot> => ({ plan: await store.listAlive('meal_plans'), logs: await store.listAlive('meals') });

  /** Refeição do plano referida pelo registro precisa existir, ser do dono e não estar excluída. */
  const checkPlan = async (db: RowStoreReads<DietRows>, log: MealLog) => {
    if (log.plan_id === null) return;
    const plan = await db.get('meal_plans', log.plan_id);
    if (!plan || plan.deleted_at !== null) throw new RepositoryError('validation');
  };
  const change = <K extends 'meal_plans' | 'meals'>(table: K, id: string, fn: (row: DietRows[K]) => DietRows[K]) =>
    guardRules(() =>
      store.transaction(async (tx) => {
        const next = fn(await aliveRow(tx, table, id));
        if (table === 'meals') await checkPlan(tx, next as MealLog);
        await tx.put(table, next);
        return next;
      }),
    );
  const remove = (table: 'meal_plans' | 'meals', id: string) => change(table, id, (row) => softDelete(row, clock)).then(() => undefined);
  const undelete = (table: 'meal_plans' | 'meals', id: string) =>
    guardRules(async () => {
      const row = await store.get(table, id);
      if (row && row.deleted_at !== null) await store.put(table, restore(row, clock));
    });

  return {
    snapshot: () => guardRules(read),
    watch: (listener, onError) => store.watch(
        () => void read().then(listener, (e) => onError?.(repositoryErrorOf(e))),
        (e) => onError?.(repositoryErrorOf(e)),
      ),
    getPlanItem: (id) => guardRules(() => aliveRow<DietRows, 'meal_plans'>(store, 'meal_plans', id)),
    createPlanItem: (draft) =>
      guardRules(async () => {
        const item = newMealPlanItem(draft, userId, clock);
        await store.put('meal_plans', item);
        return item;
      }),
    updatePlanItem: (id, patch) => change('meal_plans', id, (i) => applyMealPlanPatch(i, patch, clock)),
    removePlanItem: (id) => remove('meal_plans', id),
    restorePlanItem: (id) => undelete('meal_plans', id),
    getLog: (id) => guardRules(() => aliveRow<DietRows, 'meals'>(store, 'meals', id)),
    createLog: (draft) =>
      guardRules(() =>
        store.transaction(async (tx) => {
          // Registro de uma refeição do plano guarda o que ela era (o plano pode mudar ou sair depois).
          const plan = draft.plan_id ? await tx.get('meal_plans', draft.plan_id) : null;
          const description = draft.description?.trim() || (plan ? plan.description || plan.name : '');
          const log = newMealLog({ ...draft, description }, userId, clock);
          await checkPlan(tx, log);
          await tx.put('meals', log);
          return log;
        }),
      ),
    updateLog: (id, patch) => change('meals', id, (l) => applyMealLogPatch(l, patch, clock)),
    removeLog: (id) => remove('meals', id),
    restoreLog: (id) => undelete('meals', id),
  };
}
