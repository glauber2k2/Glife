import { describe, expect, it } from 'vitest';

import { createTranscript } from '../src/features/ai/data/transcript';

describe('transcrição ao vivo', () => {
  it('parcial substitui a anterior; final fica e a próxima fala continua', () => {
    const t = createTranscript();
    t.push('me lembra', false);
    t.push('me lembra de comprar', false);
    expect(t.text()).toBe('me lembra de comprar');
    t.push('me lembra de comprar café', true);
    t.push('amanhã', false);
    expect(t.text()).toBe('me lembra de comprar café amanhã');
    t.push('amanhã às 9h', true);
    expect(t.text()).toBe('me lembra de comprar café amanhã às 9h');
  });

  it('vazio e espaços', () => {
    const t = createTranscript();
    expect(t.text()).toBe('');
    t.push('  oi  ', true);
    expect(t.text()).toBe('oi');
  });
});
