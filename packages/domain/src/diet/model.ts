// Dieta: plano alimentar (refeições com horário, o que comer e em quais dias da semana valem, com aviso opcional) e
// o registro do que foi comido (ligado ou não a uma refeição do plano).
import { z } from 'zod';

import { createEntity, updateEntity, type BaseEntity } from '../core/index.ts';
import { ALL_WEEKDAYS, isoDateSchema, localTimeSchema } from '../time/index.ts';

export const MEAL_NAME_MAX = 80;
export const MEAL_TEXT_MAX = 500;

const nutrition = {
  kcal: z.number().int().min(0).max(20000).nullable(),
  protein_g: z.number().min(0).max(2000).nullable(),
  carbs_g: z.number().min(0).max(2000).nullable(),
  fat_g: z.number().min(0).max(2000).nullable(),
};
const NUTRITION_DEFAULTS = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

const issue = (ctx: z.RefinementCtx, message: string) => ctx.addIssue({ code: 'custom', message });
const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\r\n]/.test(s), 'Uma linha só');

// ---------- Plano ----------

const planFields = z.object({
  name: singleLine(MEAL_NAME_MAX).min(1, 'Dê um nome'),
  time: localTimeSchema,
  description: z.string().trim().max(MEAL_TEXT_MAX),
  /** dias da semana em que vale (bit 0 = domingo); pelo menos um */
  weekdays: z.number().int().min(1, 'Escolha pelo menos um dia').max(ALL_WEEKDAYS),
  remind: z.boolean(),
  ...nutrition,
});

export type MealPlanItem = z.infer<typeof planFields> & BaseEntity;
export type MealPlanDraft = Partial<z.input<typeof planFields>> & Pick<z.input<typeof planFields>, 'name' | 'time'>;
export type MealPlanPatch = Partial<z.input<typeof planFields>>;

const PLAN_DEFAULTS = { description: '', weekdays: ALL_WEEKDAYS, remind: true, ...NUTRITION_DEFAULTS };

export function newMealPlanItem(draft: MealPlanDraft, userId: string, clock?: () => Date): MealPlanItem {
  return createEntity(planFields, PLAN_DEFAULTS, draft, userId, clock) as MealPlanItem;
}
export function applyMealPlanPatch(item: MealPlanItem, changes: MealPlanPatch, clock?: () => Date): MealPlanItem {
  return updateEntity(planFields, item, changes, clock);
}

// ---------- Registro ----------

const logFields = z.object({
  date: isoDateSchema,
  time: localTimeSchema,
  description: z.string().trim().max(MEAL_TEXT_MAX),
  /** refeição do plano a que corresponde; null = fora do plano */
  plan_id: z.uuid().nullable(),
  ...nutrition,
});
const logData = logFields.superRefine((l, ctx) => {
  if (!l.description && l.plan_id === null) issue(ctx, 'Diga o que comeu');
});

export type MealLog = z.infer<typeof logFields> & BaseEntity;
export type MealLogDraft = Partial<z.input<typeof logFields>> & Pick<z.input<typeof logFields>, 'date' | 'time'>;
export type MealLogPatch = Partial<z.input<typeof logFields>>;

export function newMealLog(draft: MealLogDraft, userId: string, clock?: () => Date): MealLog {
  return createEntity(logData, { description: '', plan_id: null, ...NUTRITION_DEFAULTS }, draft, userId, clock) as MealLog;
}
export function applyMealLogPatch(log: MealLog, changes: MealLogPatch, clock?: () => Date): MealLog {
  return updateEntity(logData, log, changes, clock);
}
