// Contratos de acesso a dados de notas. Implementações: `features/notes/data` (PowerSync)
// e `@glife/domain/testing` (memória). Toda implementação passa por `notesRepositoryContract`.
//
// Regras comuns:
// - O dono é sempre o da sessão atual; quem chama nunca informa user_id.
// - Leituras ignoram excluídos (exceto `listTrash`); registro de outro dono = inexistente.
// - Erros são sempre RepositoryError (ver core/repository.ts).
import type { ErrorListener, Listener, Page, PageRequest, Unsubscribe } from '../core/index.ts';
import type { Note, NoteDraft, NoteFolder, NoteFolderDraft, NoteKind, NotePatch } from './model.ts';

export interface NoteListQuery {
  /** undefined = todas; null = só as da raiz; uuid = só as dessa pasta. */
  folderId?: string | null;
  kind?: NoteKind;
  pinned?: boolean;
  /** Trecho do título ou do corpo, sem diferenciar maiúsculas. Tratado como texto literal. */
  search?: string;
  /** Só para `watch`: quantas notas observar (padrão DEFAULT_PAGE_SIZE). */
  limit?: number;
}

export interface NotesRepository {
  get(id: string): Promise<Note | null>;
  /** Ordem: `updated_at` decrescente, `id` para desempate. */
  list(query?: NoteListQuery, page?: PageRequest): Promise<Page<Note>>;
  /** Emite a primeira página da consulta agora e a cada mudança, até cancelar. */
  watch(query: NoteListQuery, listener: Listener<Note[]>, onError?: ErrorListener): Unsubscribe;
  /** Resolve `[[Título]]`: título exato, aparado, sem diferenciar maiúsculas. */
  findIdByTitle(title: string): Promise<string | null>;
  /** `folder_id` precisa existir (senão `not_found`). */
  create(draft: NoteDraft): Promise<Note>;
  update(id: string, patch: NotePatch): Promise<Note>;
  /** Exclusão lógica (vai para a lixeira). */
  remove(id: string): Promise<void>;
  restore(id: string): Promise<Note>;
  /** Excluídas, da exclusão mais recente para a mais antiga. */
  listTrash(page?: PageRequest): Promise<Page<Note>>;
}

export interface NoteFoldersRepository {
  /** Pastas ativas, por nome (sem diferenciar maiúsculas). */
  list(): Promise<NoteFolder[]>;
  create(draft: NoteFolderDraft): Promise<NoteFolder>;
  rename(id: string, name: string): Promise<NoteFolder>;
  /** Recusa ciclo (`validation`) e destino inexistente (`not_found`). */
  move(id: string, parentId: string | null): Promise<NoteFolder>;
  /** Só pasta vazia (sem notas nem subpastas ativas); senão `conflict`. */
  remove(id: string): Promise<void>;
}
