import { describe, expect, it } from 'vitest';

import { describeCrash, installCrashReport, parseCrash, takeCrashReport } from '../src/shared/lib/crashReport';

const memory = () => {
  const data = new Map<string, string>();
  return { data, getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => void data.set(k, v) };
};

describe('erro que fecha o app', () => {
  it('erro fatal é guardado antes do tratamento padrão e mostrado uma vez', async () => {
    const storage = memory();
    let handler: (e: unknown, fatal?: boolean) => void = () => {};
    const calls: boolean[] = [];
    installCrashReport(storage, { getGlobalHandler: () => (_e, f) => void calls.push(!!f), setGlobalHandler: (h) => void (handler = h) }, () => new Date('2026-11-26T12:00:00.000Z'));
    handler(new TypeError('x is undefined'), true);
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toEqual([true]);
    const report = await takeCrashReport(storage);
    expect(report?.message.startsWith('TypeError: x is undefined')).toBe(true);
    expect(report?.at).toBe('2026-11-26T12:00:00.000Z');
    expect(await takeCrashReport(storage)).toBeNull();
  });

  it('erro não fatal segue direto e não é guardado', async () => {
    const storage = memory();
    let handler: (e: unknown, fatal?: boolean) => void = () => {};
    let called = 0;
    installCrashReport(storage, { getGlobalHandler: () => () => void called++, setGlobalHandler: (h) => void (handler = h) });
    handler(new Error('leve'), false);
    expect(called).toBe(1);
    expect(await takeCrashReport(storage)).toBeNull();
  });

  it('conteúdo inválido no armazenamento é ignorado e o texto é limitado', () => {
    expect(parseCrash('nada')).toBeNull();
    expect(parseCrash('{"at":1,"message":"x"}')).toBeNull();
    expect(parseCrash('')).toBeNull();
    expect(describeCrash('a'.repeat(5000)).length).toBeLessThanOrEqual(1500);
  });
});
