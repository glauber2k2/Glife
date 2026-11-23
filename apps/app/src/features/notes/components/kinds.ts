import type { NoteKind } from '@glife/domain/notes';

export const KIND_LABEL: Record<NoteKind, string> = { note: 'Nota', journal: 'Diário', devotional: 'Devocional' };

export const KIND_OPTIONS: { kind: NoteKind; label: string; description: string }[] = [
  { kind: 'note', label: 'Nota', description: 'Texto livre, com pasta e tags.' },
  { kind: 'journal', label: 'Diário', description: 'Uma entrada por dia, com a data como título.' },
  { kind: 'devotional', label: 'Devocional', description: 'Leitura e oração, com vínculo à passagem.' },
];
