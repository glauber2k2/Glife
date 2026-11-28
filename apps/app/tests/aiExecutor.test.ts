import { createAliasBook, resolveAlias, type AiExecContext, type AiToolKit } from '@glife/domain/ai';
import { RepositoryError } from '@glife/domain/core';
import { describe, expect, it, vi } from 'vitest';

import { executeToolCall, type ActionLog, type AiActionEntry } from '@/features/ai/executor';

const NOTE = '0b9e1a52-8c39-4a0e-9d58-2f0c3b2f8a11';

function memoryLog(): ActionLog & { entries: AiActionEntry[] } {
  const entries: AiActionEntry[] = [];
  return {
    entries,
    record: async (e) => {
      const entry = { ...e, id: `a${entries.length + 1}`, created_at: '2026-11-27T12:00:00Z', undone_at: null };
      entries.push(entry);
      return entry;
    },
  };
}

function setup() {
  const trashed: string[] = [];
  const created: string[] = [];
  const kit: AiToolKit = {
    executors: {
      notes_create: async (input, ctx) => {
        const { title } = input as { title: string };
        created.push(title);
        return { output: { note: ctx.aliases.alias('note', NOTE) }, touches: [{ entity: 'note', id: NOTE, kind: 'create', before: null }], summary: `Nota criada: ${title}` };
      },
      notes_get: async (input, ctx) => {
        const id = resolveAlias(ctx.aliases, 'note', (input as { note: string }).note);
        return { output: { id: 'escondido', ok: id === NOTE }, touches: [], summary: '' };
      },
      notes_trash: async (input, ctx) => {
        for (const a of (input as { notes: string[] }).notes) trashed.push(resolveAlias(ctx.aliases, 'note', a));
        return { output: { ok: true }, touches: [{ entity: 'note', id: NOTE, kind: 'trash', before: null }], summary: 'Nota na lixeira' };
      },
      event_trash: async () => ({ output: { ok: true }, touches: [], summary: 'Evento na lixeira' }),
      notes_update: async () => {
        throw new RepositoryError('not_found');
      },
    },
    undo: {},
  };
  const ctx: AiExecContext = { aliases: createAliasBook(), today: '2026-11-27' };
  const log = memoryLog();
  const confirm = vi.fn(async () => true);
  const run = (toolName: string, input: unknown, answer = true) => {
    confirm.mockResolvedValueOnce(answer);
    return executeToolCall({ toolName, input }, { kit, ctx, confirm, log, conversationId: 'c1' });
  };
  return { run, ctx, log, confirm, trashed, created };
}

describe('executor da IA', () => {
  it('ferramenta desconhecida não executa nada', async () => {
    const { run, log } = setup();
    expect(await run('apagar_tudo', {})).toEqual({ error: 'Ferramenta desconhecida.' });
    expect(log.entries).toHaveLength(0);
  });

  it('apelido inexistente ou UUID cru é recusado sem gravar', async () => {
    const { run, log, ctx } = setup();
    ctx.aliases.alias('note', NOTE);
    expect(await run('notes_get', { note: 'n9' })).toEqual({ error: expect.stringMatching(/n9/) });
    expect(await run('notes_get', { note: NOTE })).toEqual({ error: expect.any(String) });
    expect(log.entries).toHaveLength(0);
  });

  it('entrada inválida volta como erro ao modelo e não chama o executor', async () => {
    const { run, created } = setup();
    expect(await run('notes_create', { title: 'a\nb' })).toEqual({ error: expect.stringMatching(/Entrada inválida/) });
    expect(created).toEqual([]);
  });

  it('criar não pede confirmação e fica no registro de ações', async () => {
    const { run, confirm, log } = setup();
    expect(await run('notes_create', { title: 'Compras' })).toEqual({ note: 'n1' });
    expect(confirm).not.toHaveBeenCalled();
    expect(log.entries.map((e) => [e.tool, e.summary, e.conversation_id])).toEqual([['notes_create', 'Nota criada: Compras', 'c1']]);
  });

  it('lixeira recusada pelo usuário não grava nada, mesmo vindo de um texto de nota', async () => {
    const { run, ctx, trashed, log, confirm } = setup();
    ctx.aliases.alias('note', NOTE);
    expect(await run('notes_trash', { notes: ['n1'] }, false)).toEqual({ status: 'cancelled' });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(trashed).toEqual([]);
    expect(log.entries).toHaveLength(0);
  });

  it('lixeira confirmada executa e registra', async () => {
    const { run, ctx, trashed, log } = setup();
    ctx.aliases.alias('note', NOTE);
    expect(await run('notes_trash', { notes: ['n1'] }, true)).toEqual({ ok: true });
    expect(trashed).toEqual([NOTE]);
    expect(log.entries).toHaveLength(1);
  });

  it('evento para a lixeira também pede confirmação', async () => {
    const { run, confirm } = setup();
    await run('event_trash', { event: 'e1' }, false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('erro do repositório vira motivo legível', async () => {
    const { run } = setup();
    expect(await run('notes_update', { note: 'n1', pinned: true })).toEqual({ error: expect.stringMatching(/excluído|não encontrad/i) });
  });
});
