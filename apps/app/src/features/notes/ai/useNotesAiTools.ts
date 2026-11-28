// Kit de ferramentas de notas para o Glife IA, composto na raiz. Sem sessão, kit vazio.
import type { AiToolKit } from '@glife/domain/ai';
import { useMemo } from 'react';

import { useNotesDataMaybe } from '../hooks/NotesData';
import { createNotesAiKit } from './notesAiKit';

const EMPTY: AiToolKit = { executors: {}, undo: {} };

export function useNotesAiTools(): AiToolKit {
  const data = useNotesDataMaybe();
  return useMemo(() => (data ? createNotesAiKit(data.notes, data.folders) : EMPTY), [data]);
}
