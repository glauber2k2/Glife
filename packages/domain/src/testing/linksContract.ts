// Suíte de contrato para qualquer implementação de LinksRepository.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import type { Link, LinksRepository, SourceAddress } from '../links/index.ts';

export interface LinksContractSubject {
  links: LinksRepository;
  userId: string;
}

const NOTE_A = '9f2c0000-0000-4000-8000-00000000000a';
const NOTE_B = '9f2c0000-0000-4000-8000-00000000000b';
const TX = '41aa0000-0000-4000-8000-000000000001';
const SRC: SourceAddress = { type: 'note', id: NOTE_A };

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

export function linksRepositoryContract(name: string, make: () => Promise<LinksContractSubject>) {
  describe(`LinksRepository (${name})`, () => {
    it('cria link manual e o lista como saída e como backlink', async () => {
      const { links, userId } = await make();
      const l = await links.add(SRC, { target_type: 'tx', target_ref: TX, relation: 'receipt' });
      expect(l).toMatchObject({ user_id: userId, source_type: 'note', source_id: NOTE_A, origin: 'manual' });
      expect((await links.outgoing(SRC)).map((x) => x.id)).toEqual([l.id]);
      expect((await links.backlinks({ type: 'tx', ref: TX })).items.map((x) => x.id)).toEqual([l.id]);
    });

    it('é idempotente: o mesmo link ativo não duplica', async () => {
      const { links } = await make();
      const a = await links.add(SRC, { target_type: 'bible', target_ref: 'JHN.3.16', relation: 'ref' });
      const b = await links.add(SRC, { target_type: 'bible', target_ref: 'JHN.3.16', relation: 'ref' });
      expect(b.id).toBe(a.id);
      expect(await links.outgoing(SRC)).toHaveLength(1);
    });

    it.each([
      [{ type: 'bible', id: NOTE_A }, { target_type: 'note', target_ref: NOTE_B, relation: 'ref' }],
      [{ type: 'note', id: 'nao-uuid' }, { target_type: 'note', target_ref: NOTE_B, relation: 'ref' }],
      [SRC, { target_type: 'tx', target_ref: 'nao-uuid', relation: 'ref' }],
      [SRC, { target_type: 'bible', target_ref: 'JHN.99.1', relation: 'ref' }],
      [SRC, { target_type: 'note', target_ref: NOTE_B, relation: 'outra' }],
      [SRC, { target_type: 'note', target_ref: NOTE_A, relation: 'ref' }],
    ])('recusa link inválido %#', async (source, target) => {
      const { links } = await make();
      await expectCode(links.add(source as never, target as never), 'validation');
    });

    it('remove com exclusão lógica', async () => {
      const { links } = await make();
      const l = await links.add(SRC, { target_type: 'note', target_ref: NOTE_B, relation: 'ref' });
      await links.remove(l.id);
      expect(await links.outgoing(SRC)).toEqual([]);
      await expectCode(links.remove(l.id), 'not_found');
      // Depois de removido, pode ser recriado.
      expect((await links.add(SRC, { target_type: 'note', target_ref: NOTE_B, relation: 'ref' })).id).not.toBe(l.id);
    });

    it('aplica o diff do markdown sem tocar em links manuais', async () => {
      const { links } = await make();
      const manual = await links.add(SRC, { target_type: 'tx', target_ref: TX, relation: 'receipt' });
      await links.applyMarkdownDiff(SRC, {
        add: [{ target_type: 'note', target_ref: NOTE_B, relation: 'ref' }],
        remove: [],
        unresolved: [],
      });
      const md = (await links.outgoing(SRC)).find((x) => x.origin === 'markdown')!;
      expect(md).toMatchObject({ target_ref: NOTE_B });
      await links.applyMarkdownDiff(SRC, { add: [], remove: [md.id], unresolved: [] });
      expect((await links.outgoing(SRC)).map((x) => x.id)).toEqual([manual.id]);
    });

    it('diff não remove link de outra origem nem de outra entidade', async () => {
      const { links } = await make();
      const other: SourceAddress = { type: 'note', id: NOTE_B };
      const foreign = await links.add(other, { target_type: 'tx', target_ref: TX, relation: 'ref' });
      const manual = await links.add(SRC, { target_type: 'tx', target_ref: TX, relation: 'ref' });
      await expectCode(links.applyMarkdownDiff(SRC, { add: [], remove: [foreign.id], unresolved: [] }), 'validation');
      await expectCode(links.applyMarkdownDiff(SRC, { add: [], remove: [manual.id], unresolved: [] }), 'validation');
      expect(await links.outgoing(other)).toHaveLength(1);
      expect(await links.outgoing(SRC)).toHaveLength(1);
    });

    it('diff é atômico: item inválido não aplica nada', async () => {
      const { links } = await make();
      await expectCode(
        links.applyMarkdownDiff(SRC, {
          add: [
            { target_type: 'note', target_ref: NOTE_B, relation: 'ref' },
            { target_type: 'tx', target_ref: 'nao-uuid', relation: 'ref' },
          ],
          remove: [],
          unresolved: [],
        }),
        'validation',
      );
      expect(await links.outgoing(SRC)).toEqual([]);
    });

    it('backlinks paginam do mais recente ao mais antigo', async () => {
      const { links } = await make();
      const made: Link[] = [];
      for (let i = 1; i <= 3; i++) {
        const id = `9f2c0000-0000-4000-8000-00000000010${i}`;
        made.push(await links.add({ type: 'note', id }, { target_type: 'tx', target_ref: TX, relation: 'ref' }));
        await new Promise((r) => setTimeout(r, 5));
      }
      const p1 = await links.backlinks({ type: 'tx', ref: TX }, { limit: 2 });
      expect(p1.items.map((x) => x.id)).toEqual([made[2]!.id, made[1]!.id]);
      const p2 = await links.backlinks({ type: 'tx', ref: TX }, { limit: 2, cursor: p1.nextCursor });
      expect(p2.items.map((x) => x.id)).toEqual([made[0]!.id]);
      expect(p2.nextCursor).toBeNull();
    });

    it('observa backlinks até cancelar', async () => {
      const { links } = await make();
      const seen: number[] = [];
      const stop = links.watchBacklinks({ type: 'tx', ref: TX }, (v) => seen.push(v.length));
      await links.add(SRC, { target_type: 'tx', target_ref: TX, relation: 'ref' });
      await new Promise((r) => setTimeout(r, 20));
      expect(seen.at(-1)).toBe(1);
      stop();
      await links.add({ type: 'note', id: NOTE_B }, { target_type: 'tx', target_ref: TX, relation: 'ref' });
      await new Promise((r) => setTimeout(r, 20));
      expect(seen.at(-1)).toBe(1);
    });
  });
}
