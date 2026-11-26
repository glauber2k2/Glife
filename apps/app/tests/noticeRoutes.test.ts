import { describe, expect, it } from 'vitest';

import { SAFE_NOTICE_ROUTES, mealLogRoute, parseNoticeRef } from '../src/shared/lib/notices/types';

const ID = '8c2c0000-0000-4000-8000-000000000001';

describe('rotas abertas por aviso', () => {
  it('aceita as telas da agenda e da dieta e o registro já na refeição do plano', () => {
    for (const ok of ['/agenda', '/dieta', `/agenda/lembrete/${ID}`, `/dieta/registro/novo?plano=${ID}`]) expect(SAFE_NOTICE_ROUTES.test(ok)).toBe(true);
  });

  it('recusa o resto (outra tela, outro parâmetro, endereço de fora)', () => {
    for (const bad of [
      '/financas',
      'https://exemplo.com',
      `/dieta/registro/novo?plano=${ID}&x=1`,
      `/dieta/registro/novo?data=2026-11-26`,
      '/dieta/registro/novo?plano=../../x',
      `//exemplo.com/agenda`,
    ])
      expect(SAFE_NOTICE_ROUTES.test(bad)).toBe(false);
    expect(mealLogRoute('nao-e-id')).toBeNull();
    expect(mealLogRoute(ID)).toBe(`/dieta/registro/novo?plano=${ID}`);
  });
});

describe('parseNoticeRef', () => {
  it('só lembrete ou refeição, com id e data no formato certo', () => {
    expect(parseNoticeRef({ kind: 'reminder', id: ID, date: '2026-11-26' })).toEqual({ kind: 'reminder', id: ID, date: '2026-11-26' });
    for (const bad of [null, 'x', { kind: 'event', id: ID, date: '2026-11-26' }, { kind: 'meal', id: 'x', date: '2026-11-26' }, { kind: 'meal', id: ID, date: 26 }])
      expect(parseNoticeRef(bad)).toBeNull();
  });
});
