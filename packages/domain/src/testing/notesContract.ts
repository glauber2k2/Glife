// Suíte de contrato: toda implementação de NotesRepository/NoteFoldersRepository (memória, PowerSync…)
// precisa passar por ela. Uso: `notesRepositoryContract('PowerSync', async () => ({ notes, folders, userId }))`.
import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor, isRepositoryError } from '../core/index.ts';
import type { Note, NoteFoldersRepository, NotesRepository } from '../notes/index.ts';

export interface NotesContractSubject {
  notes: NotesRepository;
  folders: NoteFoldersRepository;
  /** Dono que a implementação usa ao gravar (sessão atual). */
  userId: string;
}

const MISSING = '00000000-0000-4000-8000-00000000dead';

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

/** Espera o próximo valor emitido que satisfaça a condição. */
function nextEmission<T>(subscribe: (l: (v: T) => void) => () => void, ok: (v: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    let stop: (() => void) | undefined;
    let done = false;
    stop = subscribe((v) => {
      if (done || !ok(v)) return;
      done = true;
      queueMicrotask(() => stop?.());
      resolve(v);
    });
  });
}

export function notesRepositoryContract(name: string, make: () => Promise<NotesContractSubject>) {
  describe(`NotesRepository (${name})`, () => {
    it('cria, lê e carimba o dono da sessão', async () => {
      const { notes, userId } = await make();
      const n = await notes.create({ title: 'Reunião' });
      expect(n.user_id).toBe(userId);
      expect(await notes.get(n.id)).toEqual(n);
      expect(await notes.get(MISSING)).toBeNull();
    });

    it('valida o rascunho', async () => {
      const { notes } = await make();
      await expectCode(notes.create({ kind: 'x' } as never), 'validation');
    });

    it('atualiza só o enviado e recusa nota inexistente', async () => {
      const { notes } = await make();
      const n = await notes.create({ title: 'a', body_md: 'corpo' });
      const u = await notes.update(n.id, { title: 'b' });
      expect(u).toMatchObject({ id: n.id, title: 'b', body_md: 'corpo' });
      expect(await notes.get(n.id)).toEqual(u);
      await expectCode(notes.update(MISSING, { title: 'x' }), 'not_found');
    });

    it('exclusão lógica: some da lista, vai para a lixeira e volta', async () => {
      const { notes } = await make();
      const n = await notes.create({ title: 'apagar' });
      await notes.remove(n.id);
      expect(await notes.get(n.id)).toBeNull();
      expect((await notes.list()).items.map((x) => x.id)).not.toContain(n.id);
      expect((await notes.listTrash()).items.map((x) => x.id)).toContain(n.id);
      await expectCode(notes.update(n.id, { title: 'x' }), 'not_found');
      await expectCode(notes.remove(n.id), 'not_found');
      const r = await notes.restore(n.id);
      expect(r.deleted_at).toBeNull();
      expect(await notes.get(n.id)).toMatchObject({ id: n.id });
      await expectCode(notes.restore(MISSING), 'not_found');
    });

    it('lista do mais recente para o mais antigo, paginando sem repetir', async () => {
      const { notes } = await make();
      const created: Note[] = [];
      for (let i = 0; i < 5; i++) created.push(await notes.create({ title: `n${i}` }));
      // Toca a primeira: passa a ser a mais recente.
      await new Promise((r) => setTimeout(r, 5));
      await notes.update(created[0]!.id, { body_md: 'mexida' });
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const page: Awaited<ReturnType<NotesRepository['list']>> = await notes.list({}, { limit: 2, cursor });
        expect(page.items.length).toBeLessThanOrEqual(2);
        seen.push(...page.items.map((x) => x.id));
        cursor = page.nextCursor;
      } while (cursor);
      expect(seen).toHaveLength(5);
      expect(new Set(seen).size).toBe(5);
      expect(seen[0]).toBe(created[0]!.id);
    });

    it('recusa cursor adulterado', async () => {
      const { notes } = await make();
      await expectCode(notes.list({}, { cursor: 'lixo' }), 'validation');
      // Cursor bem formado mas desconhecido não quebra: só devolve o que vem depois.
      const ok = encodeCursor({ sort: '1970-01-01T00:00:00.000Z', id: MISSING });
      expect(decodeCursor(ok).id).toBe(MISSING);
      expect((await notes.list({}, { cursor: ok })).items).toEqual([]);
    });

    it('filtra por pasta, tipo, fixadas e busca', async () => {
      const { notes, folders } = await make();
      const f = await folders.create({ name: 'Igreja' });
      const a = await notes.create({ title: 'Culto domingo', folder_id: f.id, kind: 'devotional' });
      const b = await notes.create({ title: 'Mercado', body_md: 'comprar CAFÉ', pinned: true });
      const ids = async (q: Parameters<NotesRepository['list']>[0]) =>
        (await notes.list(q)).items.map((x) => x.id).sort();
      expect(await ids({ folderId: f.id })).toEqual([a.id]);
      expect(await ids({ folderId: null })).toEqual([b.id]);
      expect(await ids({ kind: 'devotional' })).toEqual([a.id]);
      expect(await ids({ pinned: true })).toEqual([b.id]);
      expect(await ids({ search: 'café' })).toEqual([b.id]);
      expect(await ids({ search: 'CULTO' })).toEqual([a.id]);
      expect(await ids({ search: '%' })).toEqual([]);
    });

    it('encontra nota pelo título exato, sem diferenciar maiúsculas', async () => {
      const { notes } = await make();
      const n = await notes.create({ title: 'Reunião com pastor' });
      expect(await notes.findIdByTitle('reunião COM pastor')).toBe(n.id);
      expect(await notes.findIdByTitle('  Reunião com pastor ')).toBe(n.id);
      expect(await notes.findIdByTitle('Reunião')).toBeNull();
      await notes.remove(n.id);
      expect(await notes.findIdByTitle('Reunião com pastor')).toBeNull();
    });

    it('observa a lista: emite o estado atual, as mudanças e para ao cancelar', async () => {
      const { notes } = await make();
      const first = await nextEmission<Note[]>((l) => notes.watch({}, l), () => true);
      expect(first).toEqual([]);

      const emissions: Note[][] = [];
      const stop = notes.watch({}, (v) => emissions.push(v));
      const created = nextEmission<Note[]>((l) => notes.watch({}, l), (v) => v.length === 1);
      await notes.create({ title: 'nova' });
      expect((await created)[0]!.title).toBe('nova');
      stop();
      const count = emissions.length;
      await notes.create({ title: 'depois de cancelar' });
      await new Promise((r) => setTimeout(r, 20));
      expect(emissions.length).toBe(count);
    });
  });

  describe(`NoteFoldersRepository (${name})`, () => {
    it('cria, renomeia e lista em ordem alfabética', async () => {
      const { folders } = await make();
      const b = await folders.create({ name: 'Trabalho' });
      await folders.create({ name: 'igreja' });
      await folders.rename(b.id, 'Arquivo');
      expect((await folders.list()).map((f) => f.name)).toEqual(['Arquivo', 'igreja']);
      await expectCode(folders.rename(b.id, '  '), 'validation');
      await expectCode(folders.rename(MISSING, 'x'), 'not_found');
    });

    it('move pastas e recusa ciclos ou destino inexistente', async () => {
      const { folders } = await make();
      const a = await folders.create({ name: 'A' });
      const b = await folders.create({ name: 'B', parent_id: a.id });
      const c = await folders.create({ name: 'C' });
      expect((await folders.move(c.id, b.id)).parent_id).toBe(b.id);
      await expectCode(folders.move(a.id, c.id), 'validation');
      await expectCode(folders.move(a.id, a.id), 'validation');
      await expectCode(folders.move(a.id, MISSING), 'not_found');
      expect((await folders.move(c.id, null)).parent_id).toBeNull();
    });

    it('só exclui pasta vazia', async () => {
      const { folders, notes } = await make();
      const a = await folders.create({ name: 'A' });
      const b = await folders.create({ name: 'B', parent_id: a.id });
      const n = await notes.create({ title: 'dentro', folder_id: b.id });
      await expectCode(folders.remove(a.id), 'conflict');
      await expectCode(folders.remove(b.id), 'conflict');
      await notes.remove(n.id);
      await folders.remove(b.id);
      await folders.remove(a.id);
      expect(await folders.list()).toEqual([]);
      await expectCode(folders.remove(a.id), 'not_found');
    });

    it('nota não pode apontar para pasta inexistente', async () => {
      const { notes } = await make();
      await expectCode(notes.create({ folder_id: MISSING }), 'not_found');
      const n = await notes.create({});
      await expectCode(notes.update(n.id, { folder_id: MISSING }), 'not_found');
    });
  });
}
