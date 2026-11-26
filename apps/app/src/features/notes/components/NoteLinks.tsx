import type { Link } from '@glife/domain/links';
import { BookOpen, FileText, NotebookPen } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useLinksData } from '@/features/links';
import { NavRow, Text, makeStyles } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';
import { openNote } from '../hooks/useNoteActions';
import { KIND_LABEL } from './kinds';

interface Row {
  key: string;
  label: string;
  meta: string;
  kind: 'note' | 'journal' | 'bible' | 'other';
  noteId?: string;
}

const ICONS = { note: FileText, journal: NotebookPen, bible: BookOpen, other: FileText } as const;

/** Fim da nota em Ler: ligações de saída e "Mencionada em" (backlinks), no estilo do NoteDetail do kit. */
export function NoteLinks({ noteId, version }: { noteId: string; version: number }) {
  const s = useStyles();
  const { notes } = useNotesData();
  const { links } = useLinksData();
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
            return n ? { key: l.id, label: n.title || 'Sem título', meta: 'Nota', kind: n.kind === 'journal' ? 'journal' : 'note', noteId: n.id } : null;
          }
          if (l.target_type === 'bible') return { key: l.id, label: l.target_ref, meta: 'Bíblia', kind: 'bible' };
          return { key: l.id, label: l.target_ref, meta: l.target_type, kind: 'other' };
        }),
      );
      if (active) setOutgoing(rows.filter((r): r is Row => r !== null));
    })();
    return () => {
      active = false;
    };
  }, [links, notes, noteId, version]);

  // Entrada: observada (outra nota pode passar a citar esta a qualquer momento, inclusive pela sincronização).
  useEffect(() => links.watchBacklinks({ type: 'note', ref: noteId }, setBacklinks), [links, noteId]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const rows = await Promise.all(
        backlinks
          .filter((l) => l.source_type === 'note')
          .map(async (l): Promise<Row | null> => {
            const n = await notes.get(l.source_id);
            return n
              ? { key: l.id, label: n.title || 'Sem título', meta: KIND_LABEL[n.kind], kind: n.kind === 'journal' ? 'journal' : 'note', noteId: n.id }
              : null;
          }),
      );
      if (active) setBackRows(rows.filter((r): r is Row => r !== null));
    })();
    return () => {
      active = false;
    };
  }, [backlinks, notes]);

  if (!outgoing.length && !backRows.length) return null;

  const section = (title: string, rows: Row[], accent: boolean) =>
    rows.length > 0 && (
      <View style={s.section}>
        <Text variant="label" tone="tertiary" accessibilityRole="header" style={s.label}>
          {title}
        </Text>
        {rows.map((r) => (
          <NavRow
            key={r.key}
            icon={ICONS[r.kind]}
            label={r.label}
            meta={r.meta}
            onPress={r.noteId ? () => openNote(r.noteId!) : undefined}
          />
        ))}
      </View>
    );

  return (
    <View style={s.root}>
      {section('Vínculos', outgoing, true)}
      {section('Mencionada em', backRows, false)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { marginTop: t.space[5] + t.space[0.5], gap: t.space[6] },
  section: {},
  label: { paddingBottom: t.space[2] },
}));
