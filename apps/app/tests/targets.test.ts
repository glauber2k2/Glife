import { describe, expect, it } from 'vitest';

import {
  createRowStatus,
  createTargetResolver,
  notFoundView,
  parseNotFoundParams,
  targetOfRoute,
  type TargetSource,
} from '../src/features/links/data/targets';

const USER = '11111111-1111-4111-8111-111111111111';
const ALIVE = '8c2c0000-0000-4000-8000-000000000001';
const TRASHED = '8c2c0000-0000-4000-8000-000000000002';
const GONE = '8c2c0000-0000-4000-8000-000000000003';

function fakeDb() {
  const rows: Record<string, { deleted_at: string | null; user_id: string }> = {
    [`notes:${ALIVE}`]: { deleted_at: null, user_id: USER },
    [`notes:${TRASHED}`]: { deleted_at: '2026-11-25T10:00:00Z', user_id: USER },
  };
  const sql: string[] = [];
  return {
    sql,
    async getOptional<T>(q: string, params?: (string | number | null)[]): Promise<T | null> {
      sql.push(q);
      const table = /FROM (\w+)/.exec(q)?.[1];
      const [id, user] = params ?? [];
      const row = rows[`${table}:${id}`];
      return (row && row.user_id === user ? { deleted_at: row.deleted_at } : null) as T | null;
    },
  };
}

const note: TargetSource = { type: 'note', table: 'notes', noun: 'Esta nota', routePrefix: '/nota/', href: async (id) => `/nota/${id}` };
const reminder: TargetSource = {
  type: 'reminder',
  table: 'reminders',
  noun: 'Este lembrete',
  routePrefix: '/agenda/lembrete/',
  href: async (id) => `/agenda/lembrete/${id}`,
};

describe('resolveTarget', () => {
  const db = fakeDb();
  const resolveTarget = createTargetResolver(createRowStatus(db, USER), [note, reminder]);

  it('vivo, na lixeira (deleted_at preenchido) e ausente', async () => {
    expect(await resolveTarget('note', ALIVE)).toBe('alive');
    expect(await resolveTarget('note', TRASHED)).toBe('trash');
    expect(await resolveTarget('note', GONE)).toBe('missing');
  });

  it('só do dono da sessão, com parâmetros (sem SQL montado com o id)', async () => {
    const other = createTargetResolver(createRowStatus(db, '22222222-2222-4222-8222-222222222222'), [note]);
    expect(await other('note', ALIVE)).toBe('missing');
    expect(db.sql.every((q) => !q.includes(ALIVE))).toBe(true);
  });

  it('tipo sem fonte registrada ou id inválido: ausente, sem consultar', async () => {
    const before = db.sql.length;
    expect(await resolveTarget('tx', ALIVE)).toBe('missing');
    expect(await resolveTarget('note', "x' OR 1=1 --")).toBe('missing');
    expect(db.sql.length).toBe(before);
  });

  it('recusa nome de tabela fora do padrão', async () => {
    const bad = createTargetResolver(createRowStatus(db, USER), [{ ...note, table: 'notes; DROP TABLE notes' }]);
    expect(await bad('note', ALIVE)).toBe('missing');
  });
});

describe('tela de item não encontrado', () => {
  it('lixeira, ainda não chegou (antes da primeira sincronização ou baixando) e excluído para sempre', () => {
    expect(notFoundView('alive', { hasSynced: true, downloading: false })).toBeNull();
    expect(notFoundView('trash', { hasSynced: false, downloading: false })).toBe('lixeira');
    expect(notFoundView('missing', { hasSynced: false, downloading: false })).toBe('naosync');
    expect(notFoundView('missing', { hasSynced: undefined, downloading: false })).toBe('naosync');
    expect(notFoundView('missing', { hasSynced: true, downloading: true })).toBe('naosync');
    expect(notFoundView('missing', { hasSynced: true, downloading: false })).toBe('apagado');
  });

  it('parâmetros da rota: tipo conhecido e uuid', () => {
    expect(parseNotFoundParams({ tipo: 'note', id: ALIVE.toUpperCase() })).toEqual({ type: 'note', id: ALIVE });
    expect(parseNotFoundParams({ tipo: 'bible', id: ALIVE })).toBeNull();
    expect(parseNotFoundParams({ tipo: 'nada', id: ALIVE })).toBeNull();
    expect(parseNotFoundParams({ tipo: 'note', id: 'abc' })).toBeNull();
    expect(parseNotFoundParams({ tipo: ['note'], id: ALIVE })).toBeNull();
    expect(parseNotFoundParams({})).toBeNull();
  });

  it('rota de aviso vira alvo quando aponta para um item registrado', () => {
    expect(targetOfRoute(`/agenda/lembrete/${ALIVE}`, [note, reminder])).toEqual({ type: 'reminder', id: ALIVE });
    expect(targetOfRoute(`/nota/${ALIVE}`, [note, reminder])).toEqual({ type: 'note', id: ALIVE });
    expect(targetOfRoute('/agenda', [note, reminder])).toBeNull();
    expect(targetOfRoute(`/agenda/lembrete/${ALIVE}/x`, [note, reminder])).toBeNull();
    expect(targetOfRoute('/dieta/registro/novo?plano=1', [note, reminder])).toBeNull();
  });
});
