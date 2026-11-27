import { createInMemoryLinks, createInMemoryNotes } from '@glife/domain/testing';
import { describe, expect, it } from 'vitest';

import { createNoteWithBody, syncNoteLinks } from '../src/features/notes/data/noteLinks';

const USER = '11110000-0000-4000-8000-000000000001';

function setup() {
  const { notes } = createInMemoryNotes(USER);
  const links = createInMemoryLinks(USER);
  return { notes, links };
}

describe('vínculos [[ ]] gravados ao salvar a nota', () => {
  it('liga a nota às notas citadas pelo título', async () => {
    const repos = setup();
    const alvo = await repos.notes.create({ title: 'Lectio — como faço' });
    const nota = await repos.notes.create({ title: 'Romanos 8', body_md: 'Ver também [[lectio — COMO faço]].' });
    const result = await syncNoteLinks(repos, nota.id, nota.body_md);
    expect(result.unresolved).toEqual([]);
    const out = await repos.links.outgoing({ type: 'note', id: nota.id });
    expect(out).toMatchObject([{ target_type: 'note', target_ref: alvo.id, origin: 'markdown' }]);
  });

  it('remove o vínculo quando o [[ ]] sai do texto, sem tocar nos manuais', async () => {
    const repos = setup();
    const alvo = await repos.notes.create({ title: 'Alvo' });
    const nota = await repos.notes.create({ title: 'Origem' });
    const manual = await repos.links.add({ type: 'note', id: nota.id }, { target_type: 'bible', target_ref: 'JHN.3.16', relation: 'ref' });
    await syncNoteLinks(repos, nota.id, 'cita [[Alvo]]');
    await syncNoteLinks(repos, nota.id, 'não cita mais');
    const out = await repos.links.outgoing({ type: 'note', id: nota.id });
    expect(out.map((l) => l.id)).toEqual([manual.id]);
    expect(alvo.id).toBeDefined();
  });

  it('informa os títulos que ainda não existem', async () => {
    const repos = setup();
    const nota = await repos.notes.create({ title: 'Origem' });
    const result = await syncNoteLinks(repos, nota.id, '[[Nota que não existe]]');
    expect(result.unresolved).toEqual(['Nota que não existe']);
    expect(await repos.links.outgoing({ type: 'note', id: nota.id })).toEqual([]);
  });

  it('não liga a nota a ela mesma', async () => {
    const repos = setup();
    const nota = await repos.notes.create({ title: 'Eu mesma' });
    await syncNoteLinks(repos, nota.id, 'sou [[Eu mesma]]');
    expect(await repos.links.outgoing({ type: 'note', id: nota.id })).toEqual([]);
  });
});

describe('nota nova que já nasce com texto e vínculos (Anotar no leitor da Bíblia)', () => {
  it('cria a nota com o corpo e liga ao versículo citado', async () => {
    const repos = setup();
    const n = await createNoteWithBody(repos, { title: 'João 3:16', body: '> [[Jo 3:16]] Porque Deus amou o mundo.\n\n' });
    expect(n.body_md).toContain('[[Jo 3:16]]');
    expect(await repos.links.outgoing({ type: 'note', id: n.id })).toMatchObject([{ target_type: 'bible', target_ref: 'JHN.3.16', origin: 'markdown' }]);
  });

  it('se o vínculo não grava, a nota é apagada e o erro sobe (nada pela metade)', async () => {
    const repos = setup();
    const failing = { ...repos, links: { ...repos.links, applyMarkdownDiff: async () => Promise.reject(new Error('sem banco')) } };
    await expect(createNoteWithBody(failing, { title: 'X', body: '[[Jo 3:16]]' })).rejects.toThrow('sem banco');
    expect((await repos.notes.list()).items).toEqual([]);
    expect(await repos.notes.countTrash()).toBe(0);
  });
});
