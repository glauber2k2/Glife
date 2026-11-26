// Seleção múltipla da lista de notas: estado da seleção e as ações em lote (cada uma numa transação, com "Desfazer"
// em fixar, mover, tags e lixeira).
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

/**
 * Ações em lote sobre as notas selecionadas. Cada uma devolve true se gravou (a tela então sai da seleção).
 * `onChanged` roda depois de um "Desfazer" (ex.: recontar a lixeira).
 */
export function useBulkNoteActions(onChanged?: () => void) {
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
          void notes.updateMany(selected.map((x) => ({ id: x.id, patch: { pinned: x.pinned } }))).then(onChanged, (e: unknown) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail, onChanged],
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
          void notes.updateMany(selected.map((x) => ({ id: x.id, patch: { folder_id: x.folder_id } }))).then(onChanged, (e: unknown) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail, onChanged],
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
        onAction: () => void notes.restoreMany(ids).then(onChanged, (e: unknown) => fail('desfazer', e)),
      });
      return true;
    },
    [notes, toast, fail, onChanged],
  );

  const exportMd = useCallback(
    async (selected: readonly Note[]) => {
      try {
        // Fechou o compartilhar sem escolher: nada aconteceu, continua na seleção.
        if (!(await shareMarkdown(exportFileName(selected, today()), notesToMarkdown(selected)))) return false;
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
      const entities = selected.map((n) => ({ type: 'note' as const, id: n.id }));
      let before: { entity: (typeof entities)[number]; tagIds: string[] }[];
      try {
        // Retrato das tags de cada nota antes, para o "Desfazer" voltar exatamente a ele (numa transação).
        before = await Promise.all(entities.map(async (entity) => ({ entity, tagIds: (await tags.forEntity(entity)).map((x) => x.id) })));
        await tags.applyMany(entities, change);
      } catch (e) {
        return fail('atualizar as tags', e);
      }
      toast({
        message: 'Tags atualizadas',
        icon: TagIcon,
        aboveTabBar: true,
        actionLabel: 'Desfazer',
        onAction: () => void tags.replaceMany(before).then(onChanged, (e: unknown) => fail('desfazer', e)),
      });
      return true;
    },
    [tags, toast, fail, onChanged],
  );

  return { pin, move, trash, exportMd, applyTags };
}
