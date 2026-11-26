// Marcas de dia vindas de fora da agenda (ex.: refeições da dieta). A raiz injeta as fontes; a agenda só lê.
import type { DayOccurrence } from '@glife/domain/agenda';
import type { IsoDate } from '@glife/domain/time';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type DayMarkSource = (from: IsoDate, to: IsoDate) => DayOccurrence[];

const Ctx = createContext<readonly DayMarkSource[]>([]);

export function DayMarksProvider({ sources, children }: { sources: readonly DayMarkSource[]; children: ReactNode }) {
  return <Ctx.Provider value={sources}>{children}</Ctx.Provider>;
}

/** Junta todas as fontes injetadas num período. */
export function useExtraDayMarks(from: IsoDate, to: IsoDate): DayOccurrence[] {
  const sources = useContext(Ctx);
  return useMemo(() => sources.flatMap((src) => src(from, to)), [sources, from, to]);
}
