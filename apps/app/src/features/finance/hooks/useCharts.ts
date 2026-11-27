// Dados dos gráficos: lançamentos na regra do orçamento (com os previstos das regras até o fim do mês que vem),
// para as telas Gráficos e Categoria, o bloco-resumo de Finanças e "Mês até agora" em Hoje.
import { addMonths, chartEntries, firstEntryMonth, lastDayOf, monthOf, type ChartEntry, type FinanceData, type IsoDate, type Month, type Occurrence } from '@glife/domain/finance';
import { useMemo } from 'react';

import { todayIso } from '../components/format';
import { useFinance } from './FinanceData';
import { useOccurrences } from './useFlows';

export interface ChartsSource {
  data: FinanceData;
  occurrences: Occurrence[];
  entries: ChartEntry[];
  today: IsoDate;
  thisMonth: Month;
  /** primeiro mês com lançamento (null sem nenhum) */
  first: Month | null;
}

/** null enquanto a primeira leitura não termina. */
export function useChartsSource(): ChartsSource | null {
  const { data } = useFinance();
  const today = todayIso();
  const current = monthOf(today);
  const occurrences = useOccurrences(lastDayOf(addMonths(current, 1)));
  return useMemo(() => {
    if (!data) return null;
    const entries = chartEntries(data, occurrences);
    return { data, occurrences, entries, today, thisMonth: current, first: firstEntryMonth(entries) };
  }, [data, occurrences, today, current]);
}
