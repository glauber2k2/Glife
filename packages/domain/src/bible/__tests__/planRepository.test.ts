import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRowStore, type MemoryRowStore } from '../../testing/index.ts';
import { PLAN_TABLES, createBiblePlansRepository, type PlanRows, type PlanWithReads } from '../index.ts';

const USER = '00000000-0000-4000-8000-000000000001';
let now = 0;
const clock = () => new Date(Date.UTC(2026, 10, 27, 12, 0, now++));
let store: MemoryRowStore<PlanRows>;
const repo = () => createBiblePlansRepository(store, USER, clock);
const input = { name: 'Cartas de Paulo', groups: ['paulo' as const], days: 30, weekdays: [0, 1, 2, 3, 4, 5, 6], start_date: '2026-11-27', reminder_time: '06:30', color_hue: 350 };

const snapshot = async () => {
  let last: PlanWithReads[] = [];
  const stop = repo().watch((v) => (last = v));
  await new Promise((r) => setTimeout(r, 10));
  stop();
  return last;
};

beforeEach(() => {
  store = createMemoryRowStore<PlanRows>(PLAN_TABLES, USER);
});

describe('repositório dos planos de leitura', () => {
  it('cria com os limites da regra; fora deles recusa', async () => {
    const p = await repo().create(input);
    expect(p).toMatchObject({ name: 'Cartas de Paulo', pauses: [], completed_at: null });
    await expect(repo().create({ ...input, name: '' })).rejects.toMatchObject({ code: 'validation' });
    await expect(repo().create({ ...input, days: 731 })).rejects.toMatchObject({ code: 'validation' });
    await expect(repo().create({ ...input, weekdays: [1, 1] })).rejects.toMatchObject({ code: 'validation' });
    await expect(repo().create({ ...input, groups: [] })).rejects.toMatchObject({ code: 'validation' });
    await expect(repo().create({ ...input, reminder_time: '25:00' })).rejects.toMatchObject({ code: 'validation' });
  });

  it('não aceita mais dias de leitura do que capítulos (dias vazios contariam como lidos)', async () => {
    await expect(repo().create({ ...input, groups: ['apoc'], days: 23 })).rejects.toMatchObject({ code: 'validation' });
    const p = await repo().create({ ...input, groups: ['apoc'], days: 22 });
    await expect(repo().update(p.id, { days: 30 })).rejects.toMatchObject({ code: 'validation' });
  });

  it('retomar fecha a pausa na véspera; pausar e retomar no mesmo dia não deixa pausa', async () => {
    const p = await repo().create(input);
    await repo().pause(p.id, '2026-11-29');
    await repo().resume(p.id, '2026-12-02');
    await repo().pause(p.id, '2026-12-05');
    await repo().resume(p.id, '2026-12-05');
    const [w] = await snapshot();
    expect(w!.plan.pauses).toEqual([{ from: '2026-11-29', to: '2026-12-01' }]);
  });

  it('marcar duas vezes não duplica; desmarcar apaga as cópias de aparelhos diferentes', async () => {
    const p = await repo().create(input);
    await repo().markRead(p.id, ['ROM.1', 'ROM.2'], '2026-11-27');
    await repo().markRead(p.id, ['ROM.1'], '2026-11-27');
    expect((await snapshot())[0]!.reads.map((r) => r.ref).sort()).toEqual(['ROM.1', 'ROM.2']);
    // cópia vinda de outro aparelho (sync offline)
    const other = (await store.listAlive('bible_plan_reads')).find((r) => r.ref === 'ROM.1')!;
    await store.put('bible_plan_reads', { ...other, id: '00000000-0000-4000-8000-0000000000ff' });
    await repo().unmarkRead(p.id, 'ROM.1');
    expect((await store.listAlive('bible_plan_reads')).map((r) => r.ref)).toEqual(['ROM.2']);
  });

  it('pausar e retomar gravam o período; atualizar muda só o permitido', async () => {
    const p = await repo().create(input);
    await repo().pause(p.id, '2026-11-29');
    await repo().resume(p.id, '2026-12-01');
    await repo().update(p.id, { name: 'Paulo', days: 45, weekdays: [1, 2, 3, 4, 5], reminder_time: null });
    const [w] = await snapshot();
    expect(w!.plan).toMatchObject({ name: 'Paulo', days: 45, weekdays: [1, 2, 3, 4, 5], reminder_time: null, pauses: [{ from: '2026-11-29', to: '2026-11-30' }] });
  });

  it('refazer cria outro plano com a mesma regra começando no dia dado; o antigo continua', async () => {
    const p = await repo().create(input);
    await repo().complete(p.id);
    const again = await repo().restart(p.id, '2026-12-10');
    expect(again.id).not.toBe(p.id);
    expect(again).toMatchObject({ groups: ['paulo'], days: 30, start_date: '2026-12-10', completed_at: null, pauses: [] });
    expect((await snapshot()).map((x) => x.plan.id).sort()).toEqual([p.id, again.id].sort());
  });

  it('excluir some da lista e leva as leituras junto', async () => {
    const p = await repo().create(input);
    await repo().markRead(p.id, ['ROM.1'], '2026-11-27');
    await repo().remove(p.id);
    expect(await snapshot()).toEqual([]);
    expect(await store.listAlive('bible_plan_reads')).toEqual([]);
  });
});
