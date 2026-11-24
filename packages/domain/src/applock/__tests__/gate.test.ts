import { describe, expect, it } from 'vitest';

import { createLockGate } from '../index.ts';

const MIN = 60_000;

function setup() {
  let now = 1_000_000;
  const gate = createLockGate({ now: () => now });
  const advance = (ms: number) => {
    now += ms;
  };
  return { gate, advance };
}

describe('createLockGate', () => {
  it('começa travado: o app nunca abre sem desbloqueio', () => {
    expect(setup().gate.isLocked()).toBe(true);
  });

  it('destrava e volta a travar se ficou fora pelo menos o tempo escolhido', () => {
    const { gate, advance } = setup();
    gate.unlock();
    expect(gate.isLocked()).toBe(false);
    gate.background();
    advance(MIN);
    gate.foreground(MIN);
    expect(gate.isLocked()).toBe(true);
  });

  it('não trava se voltou antes do tempo', () => {
    const { gate, advance } = setup();
    gate.unlock();
    gate.background();
    advance(MIN - 1);
    gate.foreground(MIN);
    expect(gate.isLocked()).toBe(false);
  });

  it('"imediatamente" (0) trava em qualquer volta', () => {
    const { gate } = setup();
    gate.unlock();
    gate.background();
    gate.foreground(0);
    expect(gate.isLocked()).toBe(true);
  });

  it('voltar sem ter saído não trava', () => {
    const { gate } = setup();
    gate.unlock();
    gate.foreground(0);
    expect(gate.isLocked()).toBe(false);
  });

  it('o segundo plano causado pelo diálogo da biometria não conta', () => {
    const { gate, advance } = setup();
    const done = gate.beginSystemPrompt();
    gate.background();
    advance(5 * MIN);
    gate.foreground(0);
    done();
    gate.unlock();
    expect(gate.isLocked()).toBe(false);
    // depois do diálogo, sair volta a contar
    gate.background();
    gate.foreground(0);
    expect(gate.isLocked()).toBe(true);
  });

  it('avisa quem observa só quando o estado muda', () => {
    const { gate } = setup();
    const seen: boolean[] = [];
    const off = gate.subscribe(() => seen.push(gate.isLocked()));
    gate.unlock();
    gate.unlock();
    gate.lock();
    off();
    gate.unlock();
    expect(seen).toEqual([false, true]);
  });
});
