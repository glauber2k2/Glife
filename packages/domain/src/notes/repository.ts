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
  /** Várias atualizações numa transação, tudo ou nada (seleção múltipla e o "Desfazer" dela). */
  updateMany(changes: readonly { id: string; patch: NotePatch }[]): Promise<Note[]>;
  /** Várias para a lixeira, tudo ou nada. */
  removeMany(ids: readonly string[]): Promise<void>;
  /** Tira várias da lixeira, tudo ou nada. */
  restoreMany(ids: readonly string[]): Promise<void>;
  /** Excluídas, da exclusão mais recente para a mais antiga. */
  listTrash(page?: PageRequest): Promise<Page<Note>>;
  /** Quantas notas estão na lixeira. */
  countTrash(): Promise<number>;
  /** Apaga de vez uma nota que já está na lixeira (nota ativa: `conflict`; inexistente: `not_found`). */
  deleteForever(id: string): Promise<void>;
  /** Apaga de vez as notas da lixeira (ação explícita do usuário). Devolve quantas apagou. */
  emptyTrash(): Promise<number>;
  /** Apaga de vez o que foi para a lixeira antes de `deletedBefore` (ISO; ver `trashCutoff`). Devolve quantas. */
  purgeTrash(deletedBefore: string): Promise<number>;
}

export interface NoteFolderSummary {
  folder: NoteFolder;
  /** Notas vivas diretamente nesta pasta, sem limite de paginação. */
  notes: number;
  children: number;
}

export interface NoteFoldersRepository {
  /** Pastas ativas, por nome (sem diferenciar maiúsculas). */
  list(): Promise<NoteFolder[]>;
  listSummaries(): Promise<NoteFolderSummary[]>;
  create(draft: NoteFolderDraft): Promise<NoteFolder>;
  rename(id: string, name: string): Promise<NoteFolder>;
  /** Recusa ciclo (`validation`) e destino inexistente (`not_found`). */
  move(id: string, parentId: string | null): Promise<NoteFolder>;
  /** Só pasta vazia (sem notas nem subpastas ativas); senão `conflict`. */
  remove(id: string): Promise<void>;
  /**
   * Exclui a pasta com o que há dentro, junto: subpastas sobem para a pasta de cima; as notas também sobem
   * (`keep`) ou vão para a lixeira (`trash`), já apontando para a pasta de cima (restaurar não as perde).
   */
  removeWithContents(id: string, notes: 'keep' | 'trash'): Promise<void>;
}
