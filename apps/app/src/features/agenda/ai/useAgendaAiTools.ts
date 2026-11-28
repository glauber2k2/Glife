// Kit de ferramentas da agenda para o Glife IA, composto na raiz. Sem sessão, kit vazio.
import type { AiToolKit } from '@glife/domain/ai';
import { useMemo } from 'react';

import { useAgendaMaybe } from '../hooks/AgendaData';
import { createAgendaAiKit } from './agendaAiKit';

const EMPTY: AiToolKit = { executors: {}, undo: {} };

export function useAgendaAiTools(): AiToolKit {
  const repo = useAgendaMaybe()?.repo ?? null;
  return useMemo(() => (repo ? createAgendaAiKit(repo) : EMPTY), [repo]);
}
