import { describe, expect, it } from 'vitest';

import { HOLD_MS, LOCK_DY, holdStep, type HoldState } from '../src/features/ai/components/holdGesture';

const run = (events: Parameters<typeof holdStep>[1][]) => {
  let state: HoldState = { phase: 'idle' };
  const effects: string[] = [];
  for (const e of events) {
    const r = holdStep(state, e);
    state = r.state;
    if (r.effect) effects.push(r.effect);
  }
  return { state, effects };
};

describe('gesto do botão da Glife IA', () => {
  it('toque curto abre o compositor e não grava', () => {
    expect(run([{ type: 'down', at: 0 }, { type: 'up', at: HOLD_MS - 1 }])).toEqual({ state: { phase: 'idle' }, effects: ['openComposer'] });
  });

  it('segurar começa a ouvir; soltar envia', () => {
    expect(run([{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS }, { type: 'up', at: 900 }]).effects).toEqual(['startVoice', 'sendVoice']);
  });

  it('tick antes do tempo não começa a ouvir', () => {
    expect(run([{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS - 1 }]).effects).toEqual([]);
  });

  it('arrastar para cima trava; soltar travado não envia', () => {
    const r = run([{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS }, { type: 'move', dy: -LOCK_DY }, { type: 'up', at: 1200 }]);
    expect(r.effects).toEqual(['startVoice', 'lock']);
    expect(r.state).toEqual({ phase: 'locked' });
  });

  it('arrastar pouco não trava; mostra o progresso até o cadeado', () => {
    const r = run([{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS }, { type: 'move', dy: -(LOCK_DY / 2) }]);
    expect(r.state).toEqual({ phase: 'recording', lockProgress: 0.5 });
  });

  it('travado: enviar e cancelar encerram', () => {
    const base = [{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS }, { type: 'move', dy: -LOCK_DY - 10 }, { type: 'up', at: 1 }] as const;
    expect(run([...base, { type: 'send' }]).effects).toEqual(['startVoice', 'lock', 'sendVoice']);
    expect(run([...base, { type: 'cancel' }])).toEqual({ state: { phase: 'idle' }, effects: ['startVoice', 'lock', 'cancelVoice'] });
  });

  it('gesto interrompido pelo sistema cancela a gravação', () => {
    expect(run([{ type: 'down', at: 0 }, { type: 'tick', at: HOLD_MS }, { type: 'cancel' }]).effects).toEqual(['startVoice', 'cancelVoice']);
    expect(run([{ type: 'down', at: 0 }, { type: 'cancel' }])).toEqual({ state: { phase: 'idle' }, effects: [] });
  });
});
