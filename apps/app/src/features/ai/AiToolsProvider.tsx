// Kit de ferramentas do agente, montado na raiz com os kits de cada feature (features não se conhecem), e o
// registro local de ações. Sem banco (sessão sem aal2), não há registro.
import type { AiToolKit } from '@glife/domain/ai';
import type { LocalDb } from '@glife/domain/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createActionLog, type AiActionLog } from './data/actionLog';

interface AiTools {
  kit: AiToolKit;
  log: AiActionLog | null;
}

const Ctx = createContext<AiTools | null>(null);

/** Junta os kits; o mesmo nome de ferramenta em dois kits é erro de montagem. */
export function mergeKits(kits: readonly AiToolKit[]): AiToolKit {
  const merged: AiToolKit = { executors: {}, undo: {}, preview: {} };
  for (const kit of kits) {
    for (const [name, run] of Object.entries(kit.executors)) {
      if (merged.executors[name]) throw new Error(`Ferramenta de IA repetida: ${name}`);
      merged.executors[name] = run;
    }
    Object.assign(merged.undo, kit.undo);
    Object.assign(merged.preview!, kit.preview ?? {});
  }
  return merged;
}

export function AiToolsProvider({ db, kits, children }: { db: LocalDb | null; kits: readonly AiToolKit[]; children: ReactNode }) {
  const kit = useMemo(() => mergeKits(kits), [kits]);
  const log = useMemo(() => (db ? createActionLog(db) : null), [db]);
  const value = useMemo(() => ({ kit, log }), [kit, log]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAiTools(): AiTools {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiTools fora do AiToolsProvider');
  return v;
}
