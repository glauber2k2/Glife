// Refeições do plano como marcas de dia para o calendário da agenda (a composição fica na raiz).
import { planFor } from '@glife/domain/diet';
import { addDays, daysBetween, type IsoDate } from '@glife/domain/time';
import { useCallback } from 'react';

import { useDietMaybe } from './DietData';

/** Um dia com refeição no plano (estrutura igual à `DayOccurrence` da agenda, sem importá-la). */
export interface DietDayMark {
  date: IsoDate;
  module: 'diet';
}

/** Marcas entre duas datas (inclusive); vazio sem sessão ou antes da primeira leitura. */
export function useDietDayMarks(): (from: IsoDate, to: IsoDate) => DietDayMark[] {
  const plan = useDietMaybe()?.data?.plan ?? null;
  return useCallback(
    (from, to) => {
      if (!plan) return [];
      const out: DietDayMark[] = [];
      for (let i = 0; i <= daysBetween(from, to); i++) {
        const date = addDays(from, i);
        if (planFor(plan, date).length > 0) out.push({ date, module: 'diet' });
      }
      return out;
    },
    [plan],
  );
}
