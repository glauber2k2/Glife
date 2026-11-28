// Linhas de tarefa da agenda (Agenda e "Para hoje"): o formato e a ordem. Funções puras.
import type { AgendaItem } from '@glife/domain/agenda';

export interface Row {
  key: string;
  item: Pick<AgendaItem, 'kind' | 'id' | 'date' | 'time' | 'end_time' | 'title' | 'location'> & { repeats?: boolean; done?: boolean };
  late?: boolean;
}

const when = (r: Row) => `${r.item.date}T${r.item.time ?? ''}`;

/** Pendentes primeiro, do mais próximo ao mais longe (atrasados no topo); os feitos vão para o fim, na mesma ordem. */
export function sortRows(rows: readonly Row[]): Row[] {
  return [...rows].sort((a, b) => Number(a.item.done ?? false) - Number(b.item.done ?? false) || (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : 0));
}
