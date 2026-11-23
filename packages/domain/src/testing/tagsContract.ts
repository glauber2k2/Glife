// Suíte de contrato para qualquer implementação de TagsRepository.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import type { Tag, TagsRepository, TaggedEntity } from '../tags/index.ts';

export interface TagsContractSubject {
  tags: TagsRepository;
  userId: string;
}

const NOTE_A: TaggedEntity = { type: 'note', id: '9f2c0000-0000-4000-8000-00000000000a' };
const NOTE_B: TaggedEntity = { type: 'note', id: '9f2c0000-0000-4000-8000-00000000000b' };
const names = (tags: Tag[]) => tags.map((t) => t.name);

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

export function tagsRepositoryContract(name: string, make: () => Promise<TagsContractSubject>) {
  describe(`TagsRepository (${name})`, () => {
    it('aplica tag pelo nome, sem "#", e carimba o dono', async () => {
      const { tags, userId } = await make();
      const t = await tags.add(NOTE_A, '  #romanos ');
      expect(t).toMatchObject({ name: 'romanos', user_id: userId });
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['romanos']);
      expect(names(await tags.list())).toEqual(['romanos']);
    });

    it('reaproveita a tag sem diferenciar maiúsculas e não duplica na entidade', async () => {
      const { tags } = await make();
      const a = await tags.add(NOTE_A, 'Romanos');
      const b = await tags.add(NOTE_B, 'romanos');
      const again = await tags.add(NOTE_A, 'ROMANOS');
      expect(b.id).toBe(a.id);
      expect(again.id).toBe(a.id);
      expect(await tags.forEntity(NOTE_A)).toHaveLength(1);
      expect(await tags.list()).toHaveLength(1);
    });

    it('recusa nome vazio ou com quebra de linha', async () => {
      const { tags } = await make();
      await expectCode(tags.add(NOTE_A, ' # '), 'validation');
      await expectCode(tags.add(NOTE_A, 'a\nb'), 'validation');
    });

    it('lista em ordem alfabética', async () => {
      const { tags } = await make();
      await tags.add(NOTE_A, 'oração');
      await tags.add(NOTE_A, 'Graça');
      await tags.add(NOTE_A, 'método');
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['Graça', 'método', 'oração']);
    });

    it('tira a tag só daquela entidade', async () => {
      const { tags } = await make();
      const t = await tags.add(NOTE_A, 'casa');
      await tags.add(NOTE_B, 'casa');
      await tags.remove(NOTE_A, t.id);
      expect(await tags.forEntity(NOTE_A)).toEqual([]);
      expect(names(await tags.forEntity(NOTE_B))).toEqual(['casa']);
      // Depois de removida, pode ser aplicada de novo.
      await tags.add(NOTE_A, 'casa');
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['casa']);
    });

    it('encontra as entidades de um tipo com a tag', async () => {
      const { tags } = await make();
      const t = await tags.add(NOTE_A, 'estudo');
      await tags.add(NOTE_B, 'estudo');
      expect((await tags.entitiesWithTag(t.id, 'note')).sort()).toEqual([NOTE_A.id, NOTE_B.id].sort());
      expect(await tags.entitiesWithTag(t.id, 'tx')).toEqual([]);
    });

    it('observa as tags da entidade até cancelar', async () => {
      const { tags } = await make();
      const seen: string[][] = [];
      const stop = tags.watchForEntity(NOTE_A, (v) => seen.push(names(v)));
      await tags.add(NOTE_A, 'um');
      await new Promise((r) => setTimeout(r, 20));
      expect(seen.at(-1)).toEqual(['um']);
      stop();
      await tags.add(NOTE_A, 'dois');
      await new Promise((r) => setTimeout(r, 20));
      expect(seen.at(-1)).toEqual(['um']);
    });
  });
}
