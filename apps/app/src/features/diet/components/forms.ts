// Formulários da dieta: texto dos campos ↔ rascunho do domain (as regras ficam no domain).
import type { MealLog, MealLogDraft, MealPlanDraft, MealPlanItem } from '@glife/domain/diet';
import { ALL_WEEKDAYS, type IsoDate, type LocalTime } from '@glife/domain/time';

import type { FormResult } from '@/shared/hooks/useEntityForm';
import { formatDateInput, parseDateInput, parseTimeInput } from '@/shared/lib/calendarInput';

export interface PlanForm {
  name: string;
  time: string;
  description: string;
  weekdays: number;
  remind: boolean;
}

export const emptyPlanForm = (): PlanForm => ({ name: '', time: '', description: '', weekdays: ALL_WEEKDAYS, remind: true });
export const planToForm = (p: MealPlanItem): PlanForm => ({ name: p.name, time: p.time, description: p.description, weekdays: p.weekdays, remind: p.remind });

export function readPlanForm(f: PlanForm): FormResult<MealPlanDraft> {
  const time = parseTimeInput(f.time);
  if (!time) return { ok: false, error: 'Hora inválida (hh:mm)' };
  return { ok: true, value: { name: f.name, time, description: f.description, weekdays: f.weekdays, remind: f.remind } };
}

export interface LogForm {
  date: string;
  time: string;
  description: string;
  planId: string | null;
}

export const emptyLogForm = (date: IsoDate, time: LocalTime, planId: string | null): LogForm => ({ date: formatDateInput(date), time, description: '', planId });
export const logToForm = (l: MealLog): LogForm => ({ date: formatDateInput(l.date), time: l.time, description: l.description, planId: l.plan_id });

export function readLogForm(f: LogForm): FormResult<MealLogDraft> {
  const date = parseDateInput(f.date);
  if (!date) return { ok: false, error: 'Data inválida' };
  const time = parseTimeInput(f.time);
  if (!time) return { ok: false, error: 'Hora inválida (hh:mm)' };
  return { ok: true, value: { date, time, description: f.description, plan_id: f.planId } };
}
