// Seleção múltipla da lista de notas: estado da seleção e as ações em lote (cada uma numa transação, com "Desfazer"
// quando dá: fixar, mover e lixeira).
import type { Note } from '@glife/domain/notes';
import { FileDown, Folder, Pin, PinOff, Tag as TagIcon, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { useLinksData } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import { useToast } from '@/shared/ui';

import { exportFileName, notesToMarkdown } from '../data/exportMarkdown';
import { shareMarkdown } from '../data/shareMarkdown';
import { useNotesData } from './NotesData';
import { bulkPinTarget, toggleId } from './selection';

export interface NoteSelection {
  active: boolean;
  ids: ReadonlySet<string>;
  /** entra na seleção (com a nota do toque longo já marcada) */
  start: (id?: string) => void;
  cancel: () => void;
  toggle: (id: string) => void;
  selectAll: (ids: readonly string[]) => void;
}

export function useNoteSelection(): NoteSelection {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  return {
    active,
    ids,
    start: useCallback((id?: string) => {
      setActive(true);
      setIds(new Set(id ? [id] : []));
    }, []),
    cancel: useCallback(() => {
      setActive(false);
      setIds(new Set());
    }, []),
    toggle: useCallback((id: string) => setIds((prev) => toggleId(prev, id)), []),
    selectAll: useCallback((all: readonly string[]) => setIds(new Set(all)), []),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Ações em lote sobre as notas selecionadas. Cada uma devolve true se gravou (a tela então sai da seleção). */
export function useBulkNoteActions() {
  const { notes } = useNotesData();
  const { tags } = useLinksData();
  const toast = useToast();

  const fail = useCallback(
    (what: string, e: unknown) => {
      console.warn(`Falha ao ${what} em lote`, e);
      toast({ message: `Não foi possível ${what}: ${errorText(e)}`, aboveTabBar: true });
      return false;
    },
    [toast],
  );

  const pin = useCallback(
    async (selected: readonly Note[]) => {
      const target = bulkPinTarget(selected);
      try {
        await notes.updateMany(selected.map((n) => ({ id: n.id, patch: { pinned: target } })));
      } catch (e) {
        return fail(target ? 'fixar' : 'desafixar', e);
      }
      const n = selected.length;
      toast({
        message: target ? plural(n, 'fixada', 'fixadas') : plural(n, 'desafixada', 'desafixadas'),
        icon: target ? Pin : PinOff,
        aboveTabBar: true,
        actionLabel: 'Desfazer',
        onAction: () =>
          void notes.updateMany(selected.map((x) => ({ id: x.id, patch: { pinned: x.pinned } }))).catch((e) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail],
  );

  const move = useCallback(
    async (selected: readonly Note[], folder: { id: string; name: string } | null) => {
      try {
        await notes.updateMany(selected.map((n) => ({ id: n.id, patch: { folder_id: folder?.id ?? null } })));
      } catch (e) {
        return fail('mover', e);
      }
      toast({
        message: folder ? `Movidas para ${folder.name}` : 'Fora das pastas',
        icon: Folder,
        aboveTabBar: true,
        actionLabel: 'Desfazer',
        onAction: () =>
          void notes.updateMany(selected.map((x) => ({ id: x.id, patch: { folder_id: x.folder_id } }))).catch((e) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail],
  );

  const trash = useCallback(
    async (selected: readonly Note[]) => {
      const ids = selected.map((n) => n.id);
      try {
        await notes.removeMany(ids);
      } catch (e) {
        return fail('mover para a lixeira', e);
      }
      toast({
        message: `${plural(ids.length, 'movida', 'movidas')} para a lixeira`,
        icon: Trash2,
        aboveTabBar: true,
        actionLabel: 'Desfazer',
        onAction: () => void notes.restoreMany(ids).catch((e) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail],
  );

  const exportMd = useCallback(
    async (selected: readonly Note[]) => {
      try {
        await shareMarkdown(exportFileName(selected, today()), notesToMarkdown(selected));
      } catch (e) {
        return fail('exportar', e);
      }
      toast({ message: selected.length === 1 ? 'Arquivo .md pronto' : `${selected.length} notas num arquivo .md`, icon: FileDown, aboveTabBar: true });
      return true;
    },
    [toast, fail],
  );

  const applyTags = useCallback(
    async (selected: readonly Note[], change: { add: string[]; remove: string[] }) => {
      if (!change.add.length && !change.remove.length) return true;
      try {
        await tags.applyMany(
          selected.map((n) => ({ type: 'note' as const, id: n.id })),
          change,
        );
      } catch (e) {
        return fail('atualizar as tags', e);
      }
      toast({ message: 'Tags atualizadas', icon: TagIcon, aboveTabBar: true });
      return true;
    },
    [tags, toast, fail],
  );

  return { pin, move, trash, exportMd, applyTags };
}
