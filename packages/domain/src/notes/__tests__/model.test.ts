import { describe, expect, it } from 'vitest';

import { RepositoryError, setIdGenerator } from '../../core/index.ts';
import {
  TRASH_RETENTION_DAYS,
  trashCutoff,
  NOTE_TITLE_MAX,
  applyNotePatch,
  newNote,
  newNoteFolder,
  noteSchema,
  wouldCreateFolderCycle,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const FOLDER = 'f0000000-0000-4000-8000-000000000001';
const clock = () => new Date('2026-11-22T12:00:00.000Z');
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);

describe('newNote', () => {
  it('aplica padrões do banco e carimba dono e datas', () => {
    const n = newNote({}, USER, clock);
    expect(n).toMatchObject({
      user_id: USER,
      title: '',
      body_md: '',
      folder_id: null,
      pinned: false,
      kind: 'note',
      created_at: '2026-11-22T12:00:00.000Z',
      deleted_at: null,
    });
    expect(noteSchema.parse(n)).toEqual(n);
  });

  it('apara o título', () => {
    expect(newNote({ title: '  Reunião  ' }, USER, clock).title).toBe('Reunião');
  });

  it.each([
    [{ title: 'x'.repeat(NOTE_TITLE_MAX + 1) }],
    [{ kind: 'outro' }],
    [{ folder_id: 'nao-uuid' }],
    [{ title: 'Quebra\nde linha' }],
  ])('rejeita rascunho inválido %#', (draft) => {
    expect(() => newNote(draft as never, USER, clock)).toThrowError(RepositoryError);
  });

  it('ignora campos de sistema enviados no rascunho', () => {
    const n = newNote({ title: 'a', user_id: 'outro', id: 'x' } as never, USER, clock);
    expect(n.user_id).toBe(USER);
    expect(n.id).not.toBe('x');
  });
});

describe('applyNotePatch', () => {
  it('altera só o que foi enviado e atualiza updated_at', () => {
    const n = newNote({ title: 'a' }, USER, () => new Date('2026-01-01T00:00:00.000Z'));
    const p = applyNotePatch(n, { pinned: true }, clock);
    expect(p).toEqual({ ...n, pinned: true, updated_at: '2026-11-22T12:00:00.000Z' });
  });

  it('não permite trocar id, dono nem datas de criação/exclusão', () => {
    const n = newNote({ title: 'a' }, USER, clock);
    const p = applyNotePatch(n, { id: 'x', user_id: 'y', deleted_at: 'z', created_at: 'w' } as never, clock);
    expect(p.id).toBe(n.id);
    expect(p.user_id).toBe(USER);
    expect(p.deleted_at).toBeNull();
    expect(p.created_at).toBe(n.created_at);
  });

  it('valida o patch', () => {
    const n = newNote({}, USER, clock);
    expect(() => applyNotePatch(n, { kind: 'x' } as never, clock)).toThrowError(RepositoryError);
  });
});

describe('pastas', () => {
  it('cria pasta com nome obrigatório', () => {
    expect(newNoteFolder({ name: ' Igreja ' }, USER, clock)).toMatchObject({ name: 'Igreja', parent_id: null });
    expect(() => newNoteFolder({ name: '   ' }, USER, clock)).toThrowError(RepositoryError);
  });

  it('detecta ciclo ao mover pasta', () => {
    const A = FOLDER;
    const B = 'f0000000-0000-4000-8000-000000000002';
    const C = 'f0000000-0000-4000-8000-000000000003';
    const parents = new Map<string, string | null>([[A, null], [B, A], [C, B]]);
    const parentOf = (id: string) => parents.get(id) ?? null;
    expect(wouldCreateFolderCycle(A, C, parentOf)).toBe(true); // A dentro do próprio neto
    expect(wouldCreateFolderCycle(A, A, parentOf)).toBe(true);
    expect(wouldCreateFolderCycle(C, A, parentOf)).toBe(false);
    expect(wouldCreateFolderCycle(B, null, parentOf)).toBe(false);
  });

  it('não entra em laço infinito com dados já corrompidos', () => {
    const A = FOLDER;
    const B = 'f0000000-0000-4000-8000-000000000002';
    const D = 'f0000000-0000-4000-8000-000000000004';
    const parents = new Map<string, string | null>([[A, B], [B, A]]);
    expect(wouldCreateFolderCycle(D, A, (id) => parents.get(id) ?? null)).toBe(true);
  });
});

describe('lixeira', () => {
  it('guarda 30 dias: o corte é 30 dias antes de agora', () => {
    expect(TRASH_RETENTION_DAYS).toBe(30);
    expect(trashCutoff(new Date('2026-12-31T12:00:00.000Z'))).toBe('2026-12-01T12:00:00.000Z');
  });
});
