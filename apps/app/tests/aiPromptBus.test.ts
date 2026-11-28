import { describe, expect, it, vi } from 'vitest';

import { createPromptBus } from '../src/shared/lib/aiPrompt';

describe('pedido para a Glife IA', () => {
  it('guarda o pedido até alguém pegar, e só entrega uma vez', () => {
    const bus = createPromptBus();
    bus.ask({ text: 'oi' });
    expect(bus.take()).toEqual({ text: 'oi' });
    expect(bus.take()).toBeNull();
  });

  it('avisa quem escuta e para de avisar ao sair', () => {
    const bus = createPromptBus();
    const fn = vi.fn();
    const off = bus.subscribe(fn);
    bus.ask({ text: 'a' });
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    bus.ask({ text: 'b' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('pedido novo substitui o que ainda não foi pego; texto vazio é ignorado', () => {
    const bus = createPromptBus();
    bus.ask({ text: 'primeiro' });
    bus.ask({ text: 'segundo' });
    bus.ask({ text: '   ' });
    expect(bus.take()).toEqual({ text: 'segundo' });
  });
});
