import { formatRef, parseOsis } from '@glife/domain/bible';
import type { EntityType } from '@glife/domain/core';
import type { Link } from '@glife/domain/links';
import { BookOpen, FileText } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAddressHref, useHasTargetSource, useLinksData, useOpenAddress, useOpenTarget, useTargetSources } from '@/features/links';
import { ListGroup, NavRow, Section, makeStyles } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';
import { openNote } from '../hooks/useNoteActions';

interface Row {
  key: string;
  label: string;
  meta: string;
  kind: 'note' | 'bible' | 'other';
  noteId?: string;
  /** endereço sem UUID (ex.: versículo) que um módulo abre */
  address?: { type: EntityType; ref: string };
  /** alvo que não está vivo (lixeira, ainda não chegou, excluído): abre "Item não encontrado" */
  target?: { type: EntityType; id: string };
}

const ICONS = { note: FileText, bible: BookOpen, other: FileText } as const;

/** Fim da nota em Ler: ligações de saída e "Mencionada em" (backlinks), no estilo do NoteDetail do kit. */
export function NoteLinks({ noteId, version }: { noteId: string; version: number }) {
  const s = useStyles();
  const { notes } = useNotesData();
  const { links } = useLinksData();
  const openTarget = useOpenTarget();
  const sources = useTargetSources();
  const canOpen = useHasTargetSource();
  const openAddress = useOpenAddress();
  const addressHref = useAddressHref();
  const [outgoing, setOutgoing] = useState<Row[]>([]);
  const [backlinks, setBacklinks] = useState<Link[]>([]);
  const [backRows, setBackRows] = useState<Row[]>([]);

  // Saída: recarrega depois de cada gravação (version).
  useEffect(() => {
    let active = true;
    void (async () => {
      const out = await links.outgoing({ type: 'note', id: noteId });
      const rows = await Promise.all(
        out.map(async (l): Promise<Row | null> => {
          if (l.target_type === 'note') {
            const n = await notes.get(l.target_ref);
            return n
              ? { key: l.id, label: n.title || 'Sem título', meta: 'Nota', kind: 'note', noteId: n.id }
              : { key: l.id, label: 'Nota indisponível', meta: 'Vínculo quebrado', kind: 'note', target: { type: 'note', id: l.target_ref } };
          }
          if (l.target_type === 'bible') {
            const ref = parseOsis(l.target_ref);
            const address = addressHref('bible', l.target_ref) ? { type: 'bible' as const, ref: l.target_ref } : undefined;
            return { key: l.id, label: ref ? formatRef(ref, 'name') : l.target_ref, meta: 'Bíblia', kind: 'bible', address };
          }
          // Tipo sem tela registrada: a linha só informa (sem ação que não levaria a lugar nenhum).
          return canOpen(l.target_type)
            ? { key: l.id, label: 'Item vinculado', meta: 'Abrir', kind: 'other', target: { type: l.target_type, id: l.target_ref } }
            : { key: l.id, label: 'Item vinculado', meta: 'Ainda não abre por aqui', kind: 'other' };
        }),
      );
      if (active) setOutgoing(rows.filter((r): r is Row => r !== null));
    })();
    return () => {
      active = false;
    };
  }, [links, notes, noteId, version, canOpen, addressHref]);

  // Entrada: observada (outra nota pode passar a citar esta a qualquer momento, inclusive pela sincronização).
  useEffect(() => links.watchBacklinks({ type: 'note', ref: noteId }, setBacklinks), [links, noteId]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const rows = await Promise.all(
        backlinks.map(async (l): Promise<Row | null> => {
          if (l.source_type === 'note') {
            const n = await notes.get(l.source_id);
            return n ? { key: l.id, label: n.title || 'Sem título', meta: 'Nota', kind: 'note', noteId: n.id } : null;
          }
          // Lembrete, lançamento, refeição… que vinculou esta nota (some se o item foi excluído).
          const source = sources.find((x) => x.type === l.source_type);
          const title = source?.title ? await source.title(l.source_id).catch(() => null) : null;
          return source && title !== null
            ? { key: l.id, label: title, meta: source.kindLabel ?? 'Item', kind: 'other', target: { type: l.source_type, id: l.source_id } }
            : null;
        }),
      );
      if (active) setBackRows(rows.filter((r): r is Row => r !== null));
    })();
    return () => {
      active = false;
    };
  }, [backlinks, notes, sources]);

  if (!outgoing.length && !backRows.length) return null;

  const section = (title: string, rows: Row[], accent: boolean) =>
    rows.length > 0 && (
      <Section title={title}>
        <ListGroup>
          {rows.map((r) => (
            <NavRow
              key={r.key}
              icon={ICONS[r.kind]}
              iconSize="md"
              module={accent ? 'notes' : 'annotations'}
              label={r.label}
              meta={r.meta}
              onPress={
                r.noteId
                  ? () => openNote(r.noteId!)
                  : r.address
                    ? () => openAddress(r.address!.type, r.address!.ref)
                    : r.target
                      ? () => void openTarget(r.target!.type, r.target!.id)
                      : undefined
              }
            />
          ))}
        </ListGroup>
      </Section>
    );

  return (
    <View style={s.root}>
      {section('Liga para', outgoing, true)}
      {section('Mencionada em', backRows, false)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { marginTop: t.space[6], gap: t.space[6] },
}));
