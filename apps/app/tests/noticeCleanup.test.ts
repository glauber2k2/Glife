import { newMealPlanItem } from '@glife/domain/diet';
import { describe, expect, it } from 'vitest';

import { linkLogToPlan, emptyLogForm } from '../src/features/diet/components/forms';
import { staleNotices } from '../src/shared/lib/notices/types';

const ID = '8c2c0000-0000-4000-8000-000000000001';
const OTHER = '8c2c0000-0000-4000-8000-000000000002';
const ref = (id: string) => ({ kind: 'reminder', id, date: '2026-11-26' });

const scheduled = [
  { identifier: 'reminder:a', data: { glife: true, url: '/agenda' } },
  { identifier: 'reminder:b:adiado', data: { glife: true, snoozed: true, ref: ref(ID) } },
  { identifier: 'reminder:c:adiado', data: { glife: true, snoozed: true, ref: ref(OTHER) } },
  { identifier: 'meal:x:adiado', data: { glife: true, snoozed: true, ref: { kind: 'bad' } } },
  { identifier: 'outro-app', data: { foo: 1 } },
];

describe('avisos a cancelar', () => {
  it('troca da lista: cancela os normais e os adiados que não valem mais; mantém o adiado ainda pendente', () => {
    expect(staleNotices(scheduled, (r) => r.id === ID)).toEqual(['reminder:a', 'reminder:c:adiado', 'meal:x:adiado']);
  });

  it('sem sessão: cancela todos os do Glife, adiados inclusive; nunca os de fora', () => {
    expect(staleNotices(scheduled, () => false)).toEqual(['reminder:a', 'reminder:b:adiado', 'reminder:c:adiado', 'meal:x:adiado']);
  });
});

describe('registro ligado à refeição pelo endereço', () => {
  const USER = '11110000-0000-4000-8000-000000000001';
  const lanche = newMealPlanItem({ name: 'Lanche', time: '16:00', kcal: 300 }, USER);

  it('liga e preenche a estimativa só se a refeição existe nos dados', () => {
    const form = emptyLogForm('2026-11-26', '16:05', null);
    expect(linkLogToPlan(form, lanche.id, [lanche])).toMatchObject({ planId: lanche.id, kcal: '300' });
    expect(linkLogToPlan(form, OTHER, [lanche])).toBeNull();
    expect(linkLogToPlan(form, 'x', [lanche])).toBeNull();
    expect(linkLogToPlan(form, undefined, [lanche])).toBeNull();
  });
});

describe('fila de "Feito" esperando a sessão', () => {
  it('descarta o que passou de 5 minutos', async () => {
    const { freshPending, PENDING_ACTION_TTL_MS } = await import('../src/features/today/pendingActions');
    const event = { action: 'done' as const, notice: { kind: 'reminder' as const, id: ID, date: '2026-11-26' } };
    const queue = [
      { event, at: 1000 },
      { event, at: 1000 + PENDING_ACTION_TTL_MS + 1 },
    ];
    expect(freshPending(queue, 1000 + PENDING_ACTION_TTL_MS + 2)).toEqual([queue[1]]);
  });
});
