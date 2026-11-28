import type { AiToolKit, AiTouch } from '@glife/domain/ai';
import { RepositoryError } from '@glife/domain/core';
import { describe, expect, it } from 'vitest';

import { createActionLog } from '@/features/ai/data/actionLog';
import { aiLocalTables } from '@/features/ai/data/schema';

import { createSqliteLocalDb } from './support/sqliteLocalDb';

const touch: AiTouch = { entity: 'note', id: 'n-real', kind: 'create', before: null };

async function setup(undoImpl: (t: AiTouch) => Promise<void>) {
  const db = await createSqliteLocalDb(aiLocalTables);
  const log = createActionLog(db, () => new Date('2026-11-27T12:00:00Z'));
  const undone: AiTouch[] = [];
  const kit: AiToolKit = {
    executors: {},
    undo: {
      note: async (t) => {
        await undoImpl(t);
        undone.push(t);
      },
    },
  };
  return { log, kit, undone };
}

describe('registro de ações da IA', () => {
  it('grava, lista do mais novo para o mais antigo e desfaz uma vez só', async () => {
    const { log, kit, undone } = await setup(async () => undefined);
    const a = await log.record({ conversation_id: 'c1', tool: 'notes_create', summary: 'Nota criada: A', touches: [touch] });
    await log.record({ conversation_id: 'c1', tool: 'notes_create', summary: 'Nota criada: B', touches: [touch] });
    expect((await log.list()).map((e) => e.summary)).toEqual(['Nota criada: B', 'Nota criada: A']);
    expect(await log.undo(a.id, kit)).toEqual({ ok: true });
    expect(undone).toEqual([touch]);
    expect((await log.list()).find((e) => e.id === a.id)!.undone_at).not.toBeNull();
    expect(await log.undo(a.id, kit)).toEqual({ ok: false, reason: 'Esta ação já foi desfeita.' });
  });

  it('item que não existe mais: avisa o motivo e não marca como desfeita', async () => {
    const { log, kit } = await setup(async () => {
      throw new RepositoryError('not_found');
    });
    const a = await log.record({ conversation_id: 'c1', tool: 'notes_create', summary: 'Nota criada', touches: [touch] });
    expect(await log.undo(a.id, kit)).toEqual({ ok: false, reason: 'O item não existe mais.' });
    expect((await log.list())[0]!.undone_at).toBeNull();
  });

  it('desfaz os itens na ordem inversa', async () => {
    const order: string[] = [];
    const { log, kit } = await setup(async (t) => {
      order.push(t.id);
    });
    const a = await log.record({
      conversation_id: 'c1',
      tool: 'notes_trash',
      summary: 'Notas na lixeira',
      touches: [
        { ...touch, id: '1', kind: 'trash' },
        { ...touch, id: '2', kind: 'trash' },
      ],
    });
    await log.undo(a.id, kit);
    expect(order).toEqual(['2', '1']);
  });
});

describe('motivo legível ao desfazer', () => {
  it('erro com mensagem da IA vira o motivo do aviso', async () => {
    const { AiToolError } = await import('@glife/domain/ai');
    const { log, kit } = await setup(async () => {
      throw new AiToolError('O item mudou depois da ação da IA; desfaça à mão.');
    });
    const a = await log.record({ conversation_id: 'c1', tool: 'notes_update', summary: 'Nota alterada', touches: [touch] });
    expect(await log.undo(a.id, kit)).toEqual({ ok: false, reason: 'O item mudou depois da ação da IA; desfaça à mão.' });
  });
});
