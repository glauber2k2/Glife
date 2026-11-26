// Notas, devocionais e diário (markdown), espelhando `public.notes` e `public.note_folders`.
import { z } from 'zod';

import { baseEntitySchema, parseOrThrow, stampNew, stampUpdate } from '../core/index.ts';

export const NOTE_KINDS = ['note', 'devotional', 'journal'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_TITLE_MAX = 300;
export const NOTE_BODY_MAX = 1_000_000;
export const FOLDER_NAME_MAX = 120;

// Título e nome de pasta: uma linha só, aparados.
const singleLine = (max: number) =>
  z.string().trim().max(max).refine((s) => !/[\r\n]/.test(s), 'Uma linha só.');

export const noteSchema = baseEntitySchema.extend({
  title: z.string(),
  body_md: z.string(),
  folder_id: z.uuid().nullable(),
  pinned: z.boolean(),
  kind: z.enum(NOTE_KINDS),
});
export type Note = z.infer<typeof noteSchema>;

/** Campos que quem chama pode definir. Campos de sistema enviados a mais são descartados. */
export const noteDraftSchema = z.object({
  title: singleLine(NOTE_TITLE_MAX).default(''),
  body_md: z.string().max(NOTE_BODY_MAX).default(''),
  folder_id: z.uuid().nullable().default(null),
  pinned: z.boolean().default(false),
  kind: z.enum(NOTE_KINDS).default('note'),
});
export type NoteDraft = z.input<typeof noteDraftSchema>;

export const notePatchSchema = z.object({
  title: singleLine(NOTE_TITLE_MAX).optional(),
  body_md: z.string().max(NOTE_BODY_MAX).optional(),
  folder_id: z.uuid().nullable().optional(),
  pinned: z.boolean().optional(),
  kind: z.enum(NOTE_KINDS).optional(),
});
export type NotePatch = z.input<typeof notePatchSchema>;

export function newNote(draft: NoteDraft, userId: string, clock?: () => Date): Note {
  return stampNew(parseOrThrow(noteDraftSchema, draft), userId, clock);
}

/** Só campos editáveis entram; undefined não apaga nada. */
export function applyNotePatch(note: Note, patch: NotePatch, clock?: () => Date): Note {
  const clean = Object.fromEntries(
    Object.entries(parseOrThrow(notePatchSchema, patch)).filter(([, v]) => v !== undefined),
  ) as Partial<Note>;
  return stampUpdate(note, clean, clock);
}

// ---------- Pastas ----------

export const noteFolderSchema = baseEntitySchema.extend({
  name: z.string(),
  parent_id: z.uuid().nullable(),
});
export type NoteFolder = z.infer<typeof noteFolderSchema>;

export const folderNameSchema = singleLine(FOLDER_NAME_MAX).min(1);

export const noteFolderDraftSchema = z.object({
  name: folderNameSchema,
  parent_id: z.uuid().nullable().default(null),
});
export type NoteFolderDraft = z.input<typeof noteFolderDraftSchema>;

export function newNoteFolder(draft: NoteFolderDraft, userId: string, clock?: () => Date): NoteFolder {
  return stampNew(parseOrThrow(noteFolderDraftSchema, draft), userId, clock);
}

/** Motivo mostrado ao recusar mover uma pasta para dentro dela mesma (ou de uma subpasta dela). */
export const FOLDER_CYCLE_MESSAGE = 'A pasta não pode ir para dentro dela mesma.';

/**
 * Mover `folderId` para dentro de `newParentId` criaria ciclo?
 * Sobe a partir do novo pai; se encontrar a própria pasta (ou um ciclo já existente), recusa.
 */
export function wouldCreateFolderCycle(
  folderId: string,
  newParentId: string | null,
  parentOf: (id: string) => string | null,
): boolean {
  const visited = new Set<string>();
  for (let cur = newParentId; cur !== null; cur = parentOf(cur)) {
    if (cur === folderId || visited.has(cur)) return true;
    visited.add(cur);
  }
  return false;
}


/** Notas na lixeira são apagadas de vez depois de 30 dias. */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

/** Data ISO antes da qual o que está na lixeira já pode ser apagado de vez. */
export function trashCutoff(now: Date = new Date(), days = TRASH_RETENTION_DAYS): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}
