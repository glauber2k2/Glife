// Kit de ferramentas do agente, montado na raiz com os kits de cada feature (features não se conhecem), e o
// registro local de ações. Sem banco (sessão sem aal2), não há registro.
import type { AiToolKit } from '@glife/domain/ai';
import type { LocalDb } from '@glife/domain/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { AiChatProvider } from './AiChatProvider';
import { createActionLog, type AiActionLog } from './data/actionLog';
import { mergeKits } from './kits';

export { mergeKits };

interface AiTools {
  kit: AiToolKit;
  log: AiActionLog | null;
}

const Ctx = createContext<AiTools | null>(null);

export function AiToolsProvider({ db, kits, children }: { db: LocalDb | null; kits: readonly AiToolKit[]; children: ReactNode }) {
  const kit = useMemo(() => mergeKits(kits), [kits]);
  const log = useMemo(() => (db ? createActionLog(db) : null), [db]);
  const value = useMemo(() => ({ kit, log }), [kit, log]);
  return (
    <Ctx.Provider value={value}>
      <AiChatProvider>{children}</AiChatProvider>
    </Ctx.Provider>
  );
}

export function useAiTools(): AiTools {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiTools fora do AiToolsProvider');
  return v;
}
