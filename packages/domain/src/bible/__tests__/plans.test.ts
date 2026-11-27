import { describe, expect, it } from 'vitest';
import { PLAN_GROUPS, PLAN_TEMPLATES, chapterCount, planStatus, schedule, type PlanRule } from '../index.ts';

const ALL = [0, 1, 2, 3, 4, 5, 6];
const rule = (over: Partial<PlanRule> = {}): PlanRule => ({ groups: ['paulo'], days: 30, weekdays: ALL, start_date: '2026-11-27', pauses: [], ...over });

describe('grupos e modelos de plano', () => {
  it('os 9 grupos somam os 1.189 capítulos da Bíblia', () => {
    expect(chapterCount(PLAN_GROUPS.map((g) => g.code))).toBe(1189);
    expect(chapterCount(['paulo'])).toBe(87);
    expect(chapterCount(['evan'])).toBe(89);
  });

  it('modelos prontos', () => {
    expect(PLAN_TEMPLATES.map((t) => [t.id, t.days])).toEqual([
      ['ano', 365],
      ['nt', 90],
      ['ev30', 30],
    ]);
    expect(chapterCount(PLAN_TEMPLATES.find((t) => t.id === 'nt')!.groups)).toBe(260);
  });
});

describe('cronograma do plano', () => {
  it('Cartas de Paulo em 30 dias: os primeiros 27 dias com 3 capítulos, os 3 últimos com 2', () => {
    const days = schedule(rule(), '2026-11-27');
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ n: 1, date: '2026-11-27', refs: ['ROM.1', 'ROM.2', 'ROM.3'], label: 'Romanos 1–3' });
    expect(days.slice(0, 27).every((d) => d.refs.length === 3)).toBe(true);
    expect(days.slice(27).every((d) => d.refs.length === 2)).toBe(true);
    expect(days[5]!.label).toBe('Romanos 16 a 1 Coríntios 2');
    expect(days[29]!.date).toBe('2026-12-26');
  });

  it('só nos dias da semana escolhidos: começa sexta e o dia 2 cai na segunda', () => {
    expect(schedule(rule({ weekdays: [1, 2, 3, 4, 5] }), '2026-11-27')[1]!.date).toBe('2026-11-30');
  });

  it('pausa encerrada empurra os dias seguintes sem mexer nos anteriores', () => {
    const d = schedule(rule({ days: 5, pauses: [{ from: '2026-11-29', to: '2026-12-01' }] }), '2026-12-05').map((x) => x.date);
    expect(d).toEqual(['2026-11-27', '2026-11-28', '2026-12-02', '2026-12-03', '2026-12-04']);
  });

  it('pausa aberta vale até hoje: o próximo dia cai amanhã', () => {
    const d = schedule(rule({ days: 5, pauses: [{ from: '2026-11-29', to: null }] }), '2026-12-03');
    expect(d[2]!.date).toBe('2026-12-04');
  });
});

describe('situação do plano', () => {
  const r = (ref: string, read_on: string) => ({ ref, read_on });

  it('plano pausado não gera dias perdidos', () => {
    const s = planStatus(rule({ days: 5, pauses: [{ from: '2026-11-29', to: null }] }), [], '2026-12-03');
    expect(s.paused).toBe(true);
    expect(s.missedDays).toEqual([1, 2]);
    expect(s.current?.n).toBe(3);
  });

  it('plano que começa no futuro: dia atual é o 1, sem perdidos', () => {
    const s = planStatus(rule({ start_date: '2026-12-01' }), [], '2026-11-27');
    expect(s.current?.n).toBe(1);
    expect(s.missedDays).toEqual([]);
  });

  it('hoje não é dia de leitura (sábado num plano de segunda a sexta): dia atual é o da segunda', () => {
    const s = planStatus(rule({ weekdays: [1, 2, 3, 4, 5] }), [], '2026-11-28');
    expect(s.current?.date).toBe('2026-11-30');
  });

  it('dia lido com atraso deixa de ser perdido, mas não refaz a sequência', () => {
    const reads = [r('ROM.1', '2026-11-27'), r('ROM.2', '2026-11-27'), r('ROM.3', '2026-11-27'), r('ROM.4', '2026-11-29'), r('ROM.5', '2026-11-29'), r('ROM.6', '2026-11-29')];
    const today = [r('ROM.7', '2026-11-29'), r('ROM.8', '2026-11-29'), r('ROM.9', '2026-11-29')];
    const s = planStatus(rule(), [...reads, ...today], '2026-11-29');
    expect(s.doneDays).toEqual([1, 2, 3]);
    expect(s.missedDays).toEqual([]);
    expect(s.todayDone).toBe(true);
    expect(s.streak).toBe(1);
    const next = planStatus(rule(), reads, '2026-11-30');
    expect(next.missedDays).toEqual([3]);
    expect(next.streak).toBe(0);
  });

  it('dia de hoje ainda aberto não quebra a sequência', () => {
    const s = planStatus(rule(), [r('ROM.1', '2026-11-27'), r('ROM.2', '2026-11-27'), r('ROM.3', '2026-11-27')], '2026-11-28');
    expect(s.streak).toBe(1);
    expect(s.todayDone).toBe(false);
    expect(s.readToday).toEqual([]);
  });

  it('leitura duplicada conta uma vez; ler adiantado conclui o dia futuro', () => {
    const s = planStatus(rule(), [r('ROM.1', '2026-11-27'), r('ROM.1', '2026-11-27'), r('1CO.3', '2026-11-27'), r('1CO.4', '2026-11-27'), r('1CO.5', '2026-11-27')], '2026-11-27');
    expect(s.readToday).toEqual(['ROM.1']);
    expect(s.doneDays).toEqual([7]);
    expect(s.progress).toBeCloseTo(4 / 87, 5);
  });

  it('término, progresso e concluído', () => {
    const days = schedule(rule({ groups: ['apoc'], days: 2 }), '2026-11-27');
    const all = days.flatMap((d) => d.refs.map((ref) => r(ref, d.date)));
    const s = planStatus(rule({ groups: ['apoc'], days: 2 }), all, '2026-11-28');
    expect(s.endDate).toBe('2026-11-28');
    expect(s.completed).toBe(true);
    expect(s.progress).toBe(1);
  });
});

import { planNotices, type BiblePlan } from '../index.ts';

describe('lembretes dos planos', () => {
  const ID = '00000000-0000-4000-8000-0000000000a1';
  const plan = (over: Partial<BiblePlan> = {}): BiblePlan =>
    ({
      id: ID,
      user_id: 'u',
      name: 'Salmos',
      groups: ['poet'],
      days: 30,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      start_date: '2026-11-27',
      reminder_time: '06:30',
      color_hue: 350,
      pauses: [],
      completed_at: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      ...over,
    }) as BiblePlan;

  it('um aviso por dia de leitura nos próximos dias, com o trecho do dia e a tela do plano', () => {
    const n = planNotices([{ plan: plan(), reads: [] }], '2026-11-27', 7);
    expect(n).toHaveLength(7);
    expect(n[0]).toEqual({
      key: `bible-plan:${ID}:2026-11-27`,
      title: 'Leitura de hoje',
      body: 'Jó 1–9',
      date: '2026-11-27',
      time: '06:30',
      url: `/biblia/planos/${ID}`,
    });
  });

  it('nada para dia já lido, plano sem lembrete, pausado ou concluído; só dias de leitura', () => {
    const day1 = schedule(plan(), '2026-11-27')[0]!.refs.map((ref) => ({ ref, read_on: '2026-11-27' }));
    expect(planNotices([{ plan: plan(), reads: day1 }], '2026-11-27', 1)).toEqual([]);
    expect(planNotices([{ plan: plan({ reminder_time: null }), reads: [] }], '2026-11-27', 7)).toEqual([]);
    expect(planNotices([{ plan: plan({ pauses: [{ from: '2026-11-26', to: null }] }), reads: [] }], '2026-11-27', 7)).toEqual([]);
    expect(planNotices([{ plan: plan({ completed_at: '2026-11-27T10:00:00Z' }), reads: [] }], '2026-11-27', 7)).toEqual([]);
    expect(planNotices([{ plan: plan({ weekdays: [1] }), reads: [] }], '2026-11-27', 7).map((x) => x.date)).toEqual(['2026-11-30']);
  });
});
