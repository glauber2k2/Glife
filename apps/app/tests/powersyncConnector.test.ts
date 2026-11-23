import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseConnector,
  isFatalUploadError,
  sessionAal,
  uploadTransaction,
  type CrudOp,
  type UploadClient,
} from '../src/shared/lib/powersync/connector';

/** Supabase falso: registra cada chamada e devolve o erro programado para a tabela. */
function fakeClient(errors: Record<string, { code: string; message: string } | undefined> = {}) {
  const calls: unknown[][] = [];
  const result = (table: string) => Promise.resolve({ error: errors[table] ?? null });
  const client: UploadClient = {
    from: (table) => ({
      upsert: (row) => {
        calls.push(['upsert', table, row]);
        return result(table);
      },
      update: (data) => ({
        eq: (col, id) => {
          calls.push(['update', table, data, col, id]);
          return result(table);
        },
      }),
      delete: () => ({
        eq: (col, id) => {
          calls.push(['delete', table, col, id]);
          return result(table);
        },
      }),
    }),
  };
  return { client, calls };
}

function tx(crud: CrudOp[]) {
  return { crud, complete: vi.fn(async () => {}) };
}

/** JWT sem assinatura válida: só o payload importa para ler o aal. */
function jwt(payload: object) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.x`;
}

describe('envio da fila local ao Supabase', () => {
  it('aplica inserção, alteração e exclusão e conclui a transação', async () => {
    const { client, calls } = fakeClient();
    const t = tx([
      { op: 'PUT', table: 'notes', id: 'n1', opData: { title: 'A', user_id: 'u1' } },
      { op: 'PATCH', table: 'notes', id: 'n1', opData: { title: 'B' } },
      { op: 'DELETE', table: 'notes', id: 'n2' },
    ]);
    await uploadTransaction(t, client);
    expect(calls).toEqual([
      ['upsert', 'notes', { title: 'A', user_id: 'u1', id: 'n1' }],
      ['update', 'notes', { title: 'B' }, 'id', 'n1'],
      ['delete', 'notes', 'id', 'n2'],
    ]);
    expect(t.complete).toHaveBeenCalledOnce();
  });

  it('erro temporário (rede, servidor) é relançado e a transação fica na fila', async () => {
    const { client } = fakeClient({ notes: { code: 'PGRST301', message: 'timeout' } });
    const t = tx([{ op: 'PUT', table: 'notes', id: 'n1', opData: {} }]);
    await expect(uploadTransaction(t, client)).rejects.toMatchObject({ code: 'PGRST301' });
    expect(t.complete).not.toHaveBeenCalled();
  });

  it.each(['22P02', '23503', '23505', '42501'])('erro definitivo %s descarta a transação para não travar a fila', async (code) => {
    const { client } = fakeClient({ notes: { code, message: 'x' } });
    const t = tx([{ op: 'PUT', table: 'notes', id: 'n1', opData: {} }]);
    const onDiscard = vi.fn();
    await uploadTransaction(t, client, onDiscard);
    expect(t.complete).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledWith({ table: 'notes', op: 'PUT', code });
  });

  it('classifica erros definitivos pelo código do Postgres', () => {
    expect(isFatalUploadError({ code: '23505' })).toBe(true);
    expect(isFatalUploadError({ code: '42501' })).toBe(true);
    expect(isFatalUploadError({ code: '42P01' })).toBe(false);
    expect(isFatalUploadError(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('credenciais do PowerSync', () => {
  const endpoint = 'https://exemplo.powersync.journeyapps.com';
  const withSession = (token: string | null) => ({
    auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) },
  });

  it('lê o nível de verificação (aal) do token', () => {
    expect(sessionAal(jwt({ aal: 'aal2' }))).toBe('aal2');
    expect(sessionAal(jwt({ aal: 'aal1' }))).toBe('aal1');
    expect(sessionAal('não-é-jwt')).toBeNull();
  });

  it('entrega o token só para sessão com verificação em duas etapas', async () => {
    const token = jwt({ aal: 'aal2', sub: 'u1' });
    const connector = createSupabaseConnector({ supabase: withSession(token), endpoint, client: fakeClient().client });
    await expect(connector.fetchCredentials()).resolves.toEqual({ endpoint, token });
  });

  it('sem sessão ou só com senha (aal1), não conecta', async () => {
    const semSessao = createSupabaseConnector({ supabase: withSession(null), endpoint, client: fakeClient().client });
    const soSenha = createSupabaseConnector({
      supabase: withSession(jwt({ aal: 'aal1' })),
      endpoint,
      client: fakeClient().client,
    });
    await expect(semSessao.fetchCredentials()).resolves.toBeNull();
    await expect(soSenha.fetchCredentials()).resolves.toBeNull();
  });

  it('envia a próxima transação da fila e para quando ela está vazia', async () => {
    const { client, calls } = fakeClient();
    const queue = [tx([{ op: 'DELETE', table: 'tags', id: 't1' }])];
    const db = { getNextCrudTransaction: async () => queue.shift() ?? null };
    const connector = createSupabaseConnector({ supabase: withSession(null), endpoint, client });
    await connector.uploadData(db);
    await connector.uploadData(db);
    expect(calls).toEqual([['delete', 'tags', 'id', 't1']]);
  });
});
