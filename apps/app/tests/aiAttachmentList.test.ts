import { describe, expect, it } from 'vitest';

import { mergeAttachments } from '../src/features/ai/components/attachmentList';

const a = (name: string, size: number, truncated = false) => ({ name, text: 'x'.repeat(size), truncated });

describe('anexos somados entre escolhas', () => {
  it('o limite de 120 mil vale para a mensagem inteira', () => {
    const r = mergeAttachments([a('1.txt', 60_000), a('2.txt', 50_000)], [a('3.txt', 60_000)]);
    expect(r.items.map((i) => i.text.length)).toEqual([60_000, 50_000, 10_000]);
    expect(r.items[2]!.truncated).toBe(true);
    expect(r.notices).toEqual(['3.txt foi cortado para caber no limite de 120 mil caracteres por mensagem.']);
  });

  it('o quarto anexo sai com aviso, e o corte anterior continua marcado', () => {
    const r = mergeAttachments([a('1.txt', 10, true)], [a('2.txt', 10), a('3.txt', 10), a('4.txt', 10)]);
    expect(r.items.map((i) => i.name)).toEqual(['1.txt', '2.txt', '3.txt']);
    expect(r.items[0]!.truncated).toBe(true);
    expect(r.notices).toEqual(['Só 3 anexos por mensagem: 4.txt ficou de fora.']);
  });
});
