import type { NoteDraft } from '@glife/domain/notes';
import { router } from 'expo-router';
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { useCallback, useRef } from 'react';

import { useToast } from '@/shared/ui';

import { useNotesData } from './NotesData';

/** Volta uma tela; se a nota foi aberta direto pelo endereço (sem histórico), cai na lista de Notas. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/notas');
}

/** `expanded`: a linha tocada já se expandiu até a tela (Hoje), então a nota abre sem animação própria. */
export function openNote(id: string, opts: { fresh?: boolean; expanded?: boolean } = {}) {
  router.push({
    pathname: '/nota/[id]',
    params: { id, ...(opts.fresh ? { nova: '1' } : {}), ...(opts.expanded ? { entrada: 'expandir' } : {}) },
  });
}

/** Cria a nota e abre o editor; toques repetidos não criam duplicatas. */
export function useCreateNote() {
  const { notes } = useNotesData();
  const busy = useRef(false);
  return useCallback(
    async (draft: NoteDraft) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const note = await notes.create(draft);
        openNote(note.id, { fresh: true });
      } finally {
        busy.current = false;
      }
    },
    [notes],
  );
}

/** Lixeira com "Desfazer": o toast fica por 4 s, inclusive depois de voltar à lista. */
export function useTrashActions() {
  const { notes } = useNotesData();
  const toast = useToast();
  return {
    moveToTrash: useCallback(
      async (id: string) => {
        await notes.remove(id);
        toast({
          message: 'Nota movida para a lixeira',
          icon: Trash2,
          actionLabel: 'Desfazer',
          onAction: () => void notes.restore(id),
          aboveTabBar: true,
        });
      },
      [notes, toast],
    ),
    restore: useCallback(
      async (id: string, onUndo?: () => void) => {
        await notes.restore(id);
        toast({
          message: 'Nota restaurada',
          icon: RotateCcw,
          actionLabel: 'Desfazer',
          onAction: () => void notes.remove(id).then(onUndo),
        });
      },
      [notes, toast],
    ),
  };
}
