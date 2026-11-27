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
const TX_A: TaggedEntity = { type: 'tx', id: '9f2c0000-0000-4000-8000-0000000000c1' };
const MISSING = '00000000-0000-4000-8000-00000000dead';
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

    it('lista com a contagem por tipo de item', async () => {
      const { tags } = await make();
      const casa = await tags.add(NOTE_A, 'casa');
      await tags.add(NOTE_B, 'casa');
      await tags.add(TX_A, 'casa');
      await tags.add(NOTE_A, 'vazia');
      await tags.remove(NOTE_A, (await tags.list()).find((t) => t.name === 'vazia')!.id);
      const rows = await tags.listWithCounts();
      expect(rows.map((r) => r.tag.name)).toEqual(['casa', 'vazia']);
      expect(rows[0]).toEqual({ tag: expect.objectContaining({ id: casa.id }), counts: { note: 2, tx: 1 } });
      expect(rows[1]!.counts).toEqual({});
    });

    it('renomeia; recusa nome de outra tag (sem diferenciar maiúsculas) e tag inexistente', async () => {
      const { tags } = await make();
      const a = await tags.add(NOTE_A, 'mercado');
      const b = await tags.add(NOTE_B, 'casa');
      const renamed = await tags.rename(a.id, ' #Supermercado ');
      expect(renamed).toMatchObject({ id: a.id, name: 'Supermercado' });
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['Supermercado']);
      // Só mudar maiúsculas da própria tag é permitido.
      expect((await tags.rename(a.id, 'SUPERMERCADO')).name).toBe('SUPERMERCADO');
      await expectCode(tags.rename(a.id, 'CASA'), 'conflict');
      await expectCode(tags.rename(b.id, ' '), 'validation');
      await expectCode(tags.rename(MISSING, 'outra'), 'not_found');
    });

    it('junta: os itens passam para a escolhida sem duplicar e a de origem some', async () => {
      const { tags } = await make();
      const from = await tags.add(NOTE_A, 'feira');
      await tags.add(NOTE_B, 'feira');
      await tags.add(TX_A, 'feira');
      const into = await tags.add(NOTE_A, 'mercado'); // NOTE_A já tem as duas
      const receipt = await tags.merge(from.id, into.id);
      expect(receipt.into.id).toBe(into.id);
      expect(receipt.from.id).toBe(from.id);
      expect(receipt.movedLinkIds).toHaveLength(2);
      expect(receipt.removedLinkIds).toHaveLength(1);
      expect(names(await tags.list())).toEqual(['mercado']);
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['mercado']);
      expect((await tags.entitiesWithTag(into.id, 'note')).sort()).toEqual([NOTE_A.id, NOTE_B.id].sort());
      expect(await tags.entitiesWithTag(into.id, 'tx')).toEqual([TX_A.id]);
      expect((await tags.listWithCounts())[0]!.counts).toEqual({ note: 2, tx: 1 });
      // A tag de origem não volta: aplicar o mesmo nome cria outra.
      const again = await tags.add(NOTE_A, 'feira');
      expect(again.id).not.toBe(from.id);
    });

    it('desfaz a junção: a origem volta com os mesmos itens e a escolhida fica como era', async () => {
      const { tags } = await make();
      const from = await tags.add(NOTE_A, 'feira');
      await tags.add(NOTE_B, 'feira');
      const into = await tags.add(NOTE_A, 'mercado');
      await tags.add(TX_A, 'mercado');
      const receipt = await tags.merge(from.id, into.id);
      await tags.unmerge(receipt);
      expect(names(await tags.list())).toEqual(['feira', 'mercado']);
      expect((await tags.entitiesWithTag(from.id, 'note')).sort()).toEqual([NOTE_A.id, NOTE_B.id].sort());
      expect(await tags.entitiesWithTag(into.id, 'note')).toEqual([NOTE_A.id]);
      expect(await tags.entitiesWithTag(into.id, 'tx')).toEqual([TX_A.id]);
      expect((await tags.listWithCounts()).map((r) => r.counts)).toEqual([{ note: 2 }, { note: 1, tx: 1 }]);
    });

    it('desfazer a junção recusa se o nome da origem já foi usado por outra tag', async () => {
      const { tags } = await make();
      const from = await tags.add(NOTE_A, 'feira');
      const into = await tags.add(NOTE_B, 'mercado');
      const receipt = await tags.merge(from.id, into.id);
      await tags.add(TX_A, 'Feira');
      await expectCode(tags.unmerge(receipt), 'conflict');
      expect(await tags.entitiesWithTag(into.id, 'note')).toContain(NOTE_A.id);
    });

    it('cria tag solta pelo nome, reaproveitando a existente', async () => {
      const { tags } = await make();
      const a = await tags.create(' #Viagem ');
      expect(a).toMatchObject({ created: true, tag: { name: 'Viagem' } });
      const b = await tags.create('viagem');
      expect(b).toEqual({ created: false, tag: expect.objectContaining({ id: a.tag.id }) });
      expect((await tags.listWithCounts()).map((r) => [r.tag.name, r.counts])).toEqual([['Viagem', {}]]);
      await expectCode(tags.create(' # '), 'validation');
    });

    it('volta cada entidade ao retrato de tags anterior, em lote', async () => {
      const { tags } = await make();
      const casa = await tags.add(NOTE_A, 'casa');
      const before = [
        { entity: NOTE_A, tagIds: (await tags.forEntity(NOTE_A)).map((t) => t.id) },
        { entity: NOTE_B, tagIds: (await tags.forEntity(NOTE_B)).map((t) => t.id) },
      ];
      await tags.applyMany([NOTE_A, NOTE_B], { add: ['novo'], remove: [casa.id] });
      await tags.replaceMany(before);
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['casa']);
      expect(await tags.forEntity(NOTE_B)).toEqual([]);
    });

    it('juntar com ela mesma ou com tag inexistente é recusado e não mexe em nada', async () => {
      const { tags } = await make();
      const a = await tags.add(NOTE_A, 'casa');
      await expectCode(tags.merge(a.id, a.id), 'validation');
      await expectCode(tags.merge(a.id, MISSING), 'not_found');
      await expectCode(tags.merge(MISSING, a.id), 'not_found');
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['casa']);
      expect(await tags.entitiesWithTag(a.id, 'note')).toEqual([NOTE_A.id]);
    });

    it('exclui a tag e os vínculos; os itens ficam e o nome pode voltar', async () => {
      const { tags } = await make();
      const a = await tags.add(NOTE_A, 'natal');
      await tags.add(NOTE_A, 'casa');
      await tags.add(TX_A, 'natal');
      await tags.delete(a.id);
      expect(names(await tags.list())).toEqual(['casa']);
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['casa']);
      expect(await tags.entitiesWithTag(a.id, 'tx')).toEqual([]);
      await expectCode(tags.delete(a.id), 'not_found');
      const back = await tags.add(TX_A, 'natal');
      expect(back.id).not.toBe(a.id);
    });

    it('aplica e tira tags de vários itens de uma vez, sem duplicar', async () => {
      const { tags } = await make();
      const casa = await tags.add(NOTE_A, 'casa');
      await tags.applyMany([NOTE_A, NOTE_B], { add: ['Casa', 'novo'], remove: [] });
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['casa', 'novo']);
      expect(names(await tags.forEntity(NOTE_B))).toEqual(['casa', 'novo']);
      await tags.applyMany([NOTE_A, NOTE_B], { add: [], remove: [casa.id] });
      expect(names(await tags.forEntity(NOTE_A))).toEqual(['novo']);
      expect(names(await tags.forEntity(NOTE_B))).toEqual(['novo']);
    });

    it('aplicar em lote com um nome inválido não grava nada', async () => {
      const { tags } = await make();
      await expectCode(tags.applyMany([NOTE_A, NOTE_B], { add: ['boa', ' # '], remove: [] }), 'validation');
      expect(await tags.list()).toEqual([]);
      expect(await tags.forEntity(NOTE_A)).toEqual([]);
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
