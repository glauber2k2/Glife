import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import {
  expandRecurrence,
  materializeOccurrence,
  newAccount,
  newRecurrence,
  newTransaction,
  occurrenceId,
  splitRecurrence,
  type Recurrence,
  type RecurrenceDraft,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const CC = 'acc00000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);

const createdOn = (day: string) => () => new Date(`${day}T12:00:00.000Z`);
const salary = (draft: Partial<RecurrenceDraft> = {}, created = '2026-01-01'): Recurrence =>
  newRecurrence(
    { type: 'income', amount_cents: 500000, account_id: CC, frequency: 'monthly', start_date: '2026-12-10', ...draft },
    USER,
    createdOn(created),
  );
const dates = (rule: Recurrence, from: string, to: string, rows = []) =>
  expandRecurrence(rule, from, to, rows).map((o) => o.date);

describe('occurrenceId', () => {
  it('UUID v5 determinístico por regra e data', () => {
    const a = occurrenceId(CC, '2026-12-10');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(occurrenceId(CC, '2026-12-10')).toBe(a);
    expect(occurrenceId(CC, '2027-01-10')).not.toBe(a);
    expect(occurrenceId('acc00000-0000-4000-8000-000000000002', '2026-12-10')).not.toBe(a);
  });
});

describe('expandRecurrence', () => {
  it('mensal no dia 31 cai no último dia dos meses curtos', () => {
    expect(dates(salary({ start_date: '2026-01-31' }), '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('não cria passado anterior ao cadastro da regra', () => {
    expect(dates(salary({ start_date: '2024-01-10' }, '2026-11-24'), '2024-01-01', '2026-12-31')).toEqual(['2026-12-10']);
  });

  it('semanal a cada 2 semanas, até o fim da regra', () => {
    const rule = salary({ frequency: 'weekly', interval_count: 2, start_date: '2026-12-01', end_date: '2026-12-29' });
    expect(dates(rule, '2026-12-01', '2027-02-01')).toEqual(['2026-12-01', '2026-12-15', '2026-12-29']);
  });

  it('anual em 29/02 cai em 28/02 nos anos comuns', () => {
    const rule = salary({ frequency: 'yearly', start_date: '2028-02-29' });
    expect(dates(rule, '2028-01-01', '2030-12-31')).toEqual(['2028-02-29', '2029-02-28', '2030-02-28']);
  });

  it('ocorrência calculada vem prevista, com id determinístico e o molde da regra', () => {
    const rule = salary();
    const [o] = expandRecurrence(rule, '2026-12-01', '2026-12-31', []);
    expect(o).toMatchObject({
      id: occurrenceId(rule.id, '2026-12-10'),
      recurrence_id: rule.id,
      date: '2026-12-10',
      amount_cents: 500000,
      status: 'planned',
      type: 'income',
      account_id: CC,
      materialized: null,
    });
  });

  it('linha gravada vence a calculada; excluída devolve a calculada', () => {
    const rule = salary();
    const row = (fields: object) =>
      newTransaction(
        {
          type: 'income',
          amount_cents: 520000,
          date: '2026-12-11',
          account_id: CC,
          recurrence_id: rule.id,
          occurrence_date: '2026-12-10',
          ...fields,
        },
        USER,
      );
    const confirmed = row({ status: 'confirmed' });
    expect(expandRecurrence(rule, '2026-12-01', '2026-12-31', [confirmed])[0]).toMatchObject({
      status: 'confirmed',
      amount_cents: 520000,
      date: '2026-12-11',
      materialized: confirmed,
    });
    expect(expandRecurrence(rule, '2026-12-01', '2026-12-31', [row({ status: 'skipped' })])[0]!.status).toBe('skipped');
    const deleted = { ...confirmed, deleted_at: '2026-12-12T00:00:00.000Z' };
    expect(expandRecurrence(rule, '2026-12-01', '2026-12-31', [deleted])[0]).toMatchObject({
      status: 'planned',
      amount_cents: 500000,
      materialized: null,
    });
  });
});

describe('materializeOccurrence', () => {
  it('grava a ocorrência com id determinístico e data original', () => {
    const rule = salary();
    const account = newAccount({ name: 'Itaú', kind: 'checking' }, USER);
    const t = materializeOccurrence(rule, '2026-12-10', { status: 'confirmed', amount_cents: 520000, date: '2026-12-11' }, account);
    expect(t).toMatchObject({
      id: occurrenceId(rule.id, '2026-12-10'),
      recurrence_id: rule.id,
      occurrence_date: '2026-12-10',
      date: '2026-12-11',
      amount_cents: 520000,
      status: 'confirmed',
      invoice_month: null,
    });
  });

  it('no cartão calcula a fatura da ocorrência', () => {
    const card = newAccount({ name: 'Nu', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: CC }, USER);
    const rule = salary({ type: 'expense', amount_cents: 3990, account_id: card.id, start_date: '2026-11-26' });
    expect(materializeOccurrence(rule, '2026-11-26', { status: 'skipped' }, card).invoice_month).toBe('2026-12');
  });
});

describe('splitRecurrence', () => {
  it('encerra a regra na véspera e cria a nova a partir da data', () => {
    const rule = salary();
    const { endedPatch, next } = splitRecurrence(rule, '2027-03-10', { amount_cents: 550000 });
    expect(endedPatch).toEqual({ end_date: '2027-03-09' });
    expect(next).toMatchObject({ start_date: '2027-03-10', amount_cents: 550000, type: 'income', frequency: 'monthly' });
  });

  it('recusa dividir no início da regra ou antes', () => {
    expect(() => splitRecurrence(salary(), '2026-12-10', {})).toThrow(RangeError);
  });
});

describe('revisão: created_at ilegível', () => {
  it('não some com as ocorrências; conta a partir do início da regra', () => {
    const rule = { ...salary(), created_at: 'lixo' };
    expect(dates(rule, '2026-12-01', '2027-01-31')).toEqual(['2026-12-10', '2027-01-10']);
  });
});
