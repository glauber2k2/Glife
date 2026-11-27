// Notas vinculadas a um item qualquer (lembrete, gasto, refeição…). A feature de notas entrega na raiz como buscar,
// criar e nomear notas (porta abaixo); quem desenha o campo não conhece as notas. Os vínculos são links manuais
// `about` do item para a nota (ver `noteLinkChange`), gravados junto com o item.
import { linkedNoteIds, noteLinkChange, type Link, type SourceType } from '@glife/domain/links';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useLinksDataMaybe } from './LinksData';

export interface NoteChoice {
  id: string;
  title: string;
}

/** O que a feature de notas oferece aos campos de descrição. */
export interface NoteLinkerPort {
  /** notas vivas cujo título ou texto têm `query` (vazio: as mais recentes) */
  search(query: string): Promise<NoteChoice[]>;
  /** cria uma nota vazia com este título */
  create(title: string): Promise<NoteChoice>;
  /** título de uma nota viva; null se excluída ou ainda não chegou */
  title(id: string): Promise<string | null>;
}

const NoteLinkerContext = createContext<NoteLinkerPort | null>(null);

export function NoteLinkerProvider({ port, children }: { port: NoteLinkerPort | null; children: ReactNode }) {
  return <NoteLinkerContext.Provider value={port}>{children}</NoteLinkerContext.Provider>;
}

/** Porta das notas; null sem sessão. */
export function useNoteLinker(): NoteLinkerPort | null {
  return useContext(NoteLinkerContext);
}

export interface LinkedNote {
  id: string;
  /** null = nota excluída ou que ainda não chegou neste aparelho */
  title: string | null;
}

export interface LinkedNotes {
  notes: LinkedNote[];
  add(note: NoteChoice): void;
  remove(id: string): void;
  /** Liga/desliga para ficar como na tela. Devolve como desfazer (se o resto da gravação falhar). */
  apply(sourceId: string): Promise<() => Promise<void>>;
  /** false enquanto lê os vínculos de um item já salvo */
  ready: boolean;
}

/**
 * Estado do campo "Notas vinculadas" de um item do tipo `type`. `id` vazio = item novo (nada a ler). Nada é gravado
 * antes de `apply`, chamado por quem salva o item.
 */
export function useLinkedNotes(type: SourceType, id: string | undefined): LinkedNotes {
  const links = useLinksDataMaybe()?.links ?? null;
  const port = useNoteLinker();
  const [notes, setNotes] = useState<LinkedNote[]>([]);
  const [ready, setReady] = useState(!id);
  const touched = useRef(false);

  useEffect(() => {
    if (!id || !links || !port) return;
    let active = true;
    void (async () => {
      try {
        const ids = linkedNoteIds(await links.outgoing({ type, id }));
        const loaded = await Promise.all(ids.map(async (n) => ({ id: n, title: await port.title(n).catch(() => null) })));
        // Quem já mexeu na lista antes de ler não perde o que escolheu.
        if (active && !touched.current) setNotes(loaded);
      } catch (e) {
        console.warn('Falha ao ler as notas vinculadas', e);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [type, id, links, port]);

  const add = useCallback((note: NoteChoice) => {
    touched.current = true;
    setNotes((list) => (list.some((n) => n.id === note.id) ? list : [...list, { id: note.id, title: note.title }]));
  }, []);
  const remove = useCallback((noteId: string) => {
    touched.current = true;
    setNotes((list) => list.filter((n) => n.id !== noteId));
  }, []);

  const apply = useCallback(
    async (sourceId: string) => {
      const noop = async () => undefined;
      if (!links) return noop;
      const source = { type, id: sourceId };
      const existing = await links.outgoing(source);
      const change = noteLinkChange(existing, notes.map((n) => n.id));
      const added: Link[] = [];
      const removed: string[] = [];
      const undo = async () => {
        for (const l of added) await links.remove(l.id).catch(() => undefined);
        for (const target of removed) await links.add(source, { target_type: 'note', target_ref: target, relation: 'about' }).catch(() => undefined);
      };
      try {
        for (const d of change.add) added.push(await links.add(source, d));
        for (const linkId of change.remove) {
          await links.remove(linkId);
          const l = existing.find((x) => x.id === linkId);
          if (l) removed.push(l.target_ref);
        }
      } catch (e) {
        await undo();
        throw e;
      }
      return undo;
    },
    [links, notes, type],
  );

  return useMemo(() => ({ notes, add, remove, apply, ready }), [notes, add, remove, apply, ready]);
}
