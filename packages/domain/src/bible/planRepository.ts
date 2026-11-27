// Repositório dos planos de leitura sobre um RowStore: o plano guarda a regra; cada capítulo lido é uma linha.
// Sem unique no banco (aparelhos offline): marcar ignora o que já está lido; desmarcar apaga todas as cópias.
import { z } from 'zod';

import {
  createEntity,
  guardRules,
  repositoryErrorOf,
  softDelete,
  updateEntity,
  RepositoryError,
  type BaseEntity,
  type ErrorListener,
  type Listener,
  type RowStore,
  type Unsubscribe,
} from '../core/index.ts';
import { addDays, isoDateSchema, localTimeSchema, type IsoDate } from '../time/index.ts';
import { PLAN_GROUP_CODES, chapterCount, type PlanGroup, type PlanPause, type PlanRule } from './plans.ts';

const unique = <T,>(xs: readonly T[]) => new Set(xs).size === xs.length;

const planShape = z.object({
  name: z.string().trim().min(1).max(60),
  groups: z.array(z.enum(PLAN_GROUP_CODES)).min(1).max(PLAN_GROUP_CODES.length).refine(unique),
  days: z.number().int().min(1).max(730),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(unique),
  start_date: isoDateSchema,
  reminder_time: localTimeSchema.nullable(),
  color_hue: z.number().int().min(0).max(359),
  pauses: z.array(z.object({ from: isoDateSchema, to: isoDateSchema.nullable() })),
  completed_at: z.string().nullable(),
});
// mais dias do que capítulos deixaria dias vazios (contariam como lidos sem leitura)
const planFields = planShape.refine((p) => p.days <= chapterCount(p.groups), { message: 'Mais dias do que capítulos', path: ['days'] });
const readFields = z.object({
  plan_id: z.string().uuid(),
  ref: z.string().regex(/^[1-3]?[A-Z]{2,3}\.[0-9]{1,3}$/),
  read_on: isoDateSchema,
});

export type BiblePlan = BaseEntity & z.infer<typeof planShape> & PlanRule & { groups: PlanGroup[]; pauses: PlanPause[] };
export type BiblePlanRead = BaseEntity & z.infer<typeof readFields>;
export type PlanRows = { bible_plans: BiblePlan; bible_plan_reads: BiblePlanRead };
export const PLAN_TABLES = ['bible_plans', 'bible_plan_reads'] as const;

export interface PlanWithReads {
  plan: BiblePlan;
  reads: { ref: string; read_on: IsoDate }[];
}

export interface NewPlanInput {
  name: string;
  groups: PlanGroup[];
  days: number;
  weekdays: number[];
  start_date: IsoDate;
  reminder_time: string | null;
  /** matiz da paleta de planos, escolhida pelo app em rodízio */
  color_hue: number;
}

export interface BiblePlansRepository {
  watch(listener: Listener<PlanWithReads[]>, onError?: ErrorListener): Unsubscribe;
  create(input: NewPlanInput): Promise<BiblePlan>;
  update(id: string, patch: Partial<Pick<BiblePlan, 'name' | 'days' | 'weekdays' | 'reminder_time'>>): Promise<void>;
  markRead(planId: string, refs: readonly string[], on: IsoDate): Promise<void>;
  unmarkRead(planId: string, ref: string): Promise<void>;
  pause(id: string, on: IsoDate): Promise<void>;
  resume(id: string, on: IsoDate): Promise<void>;
  complete(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  restart(id: string, on: IsoDate): Promise<BiblePlan>;
}

export function createBiblePlansRepository(store: RowStore<PlanRows>, userId: string, clock?: () => Date): BiblePlansRepository {
  const list = async (): Promise<PlanWithReads[]> => {
    const [plans, reads] = await Promise.all([store.listAlive('bible_plans'), store.listAlive('bible_plan_reads')]);
    return plans
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((plan) => ({ plan, reads: reads.filter((r) => r.plan_id === plan.id).map(({ ref, read_on }) => ({ ref, read_on })) }));
  };
  const alivePlan = async (id: string) => {
    const p = await store.get('bible_plans', id);
    if (!p || p.deleted_at) throw new RepositoryError('not_found');
    return p;
  };
  const save = (id: string, change: (p: BiblePlan) => object) =>
    guardRules(async () => {
      const p = await alivePlan(id);
      await store.put('bible_plans', updateEntity(planFields, p, change(p), clock) as BiblePlan);
    });
  const create = (input: NewPlanInput) =>
    guardRules(async () => {
      const plan = createEntity(planFields, { pauses: [], completed_at: null }, input, userId, clock) as BiblePlan;
      await store.put('bible_plans', plan);
      return plan;
    });

  return {
    watch: (listener, onError) =>
      store.watch(
        () => void list().then(listener, (e) => onError?.(repositoryErrorOf(e))),
        (e) => onError?.(repositoryErrorOf(e)),
      ),
    create,
    update: (id, patch) => save(id, () => patch),
    markRead: (planId, refs, on) =>
      guardRules(async () => {
        await alivePlan(planId);
        await store.transaction(async (tx) => {
          const have = new Set((await tx.listAlive('bible_plan_reads')).filter((r) => r.plan_id === planId).map((r) => r.ref));
          for (const ref of new Set(refs)) {
            if (have.has(ref)) continue;
            await tx.put('bible_plan_reads', createEntity(readFields, {}, { plan_id: planId, ref, read_on: on }, userId, clock) as BiblePlanRead);
          }
        });
      }),
    unmarkRead: (planId, ref) =>
      guardRules(async () => {
        await store.transaction(async (tx) => {
          for (const r of await tx.listAlive('bible_plan_reads')) if (r.plan_id === planId && r.ref === ref) await tx.put('bible_plan_reads', softDelete(r, clock));
        });
      }),
    pause: (id, on) => save(id, (p) => (p.pauses.some((x) => x.to === null) ? {} : { pauses: [...p.pauses, { from: on, to: null }] })),
    // a pausa vale até a véspera da retomada (hoje já conta); retomar no próprio dia da pausa desfaz a pausa
    resume: (id, on) =>
      save(id, (p) => ({
        pauses: p.pauses.flatMap((x) => (x.to !== null ? [x] : on <= x.from ? [] : [{ from: x.from, to: addDays(on, -1) }])),
      })),
    complete: (id) => save(id, () => ({ completed_at: (clock?.() ?? new Date()).toISOString() })),
    remove: (id) =>
      guardRules(async () => {
        const p = await alivePlan(id);
        await store.transaction(async (tx) => {
          await tx.put('bible_plans', softDelete(p, clock));
          for (const r of await tx.listAlive('bible_plan_reads')) if (r.plan_id === id) await tx.put('bible_plan_reads', softDelete(r, clock));
        });
      }),
    restart: async (id, on) => {
      const p = await guardRules(() => alivePlan(id));
      return create({ name: p.name, groups: p.groups, days: p.days, weekdays: p.weekdays, start_date: on, reminder_time: p.reminder_time, color_hue: p.color_hue });
    },
  };
}

