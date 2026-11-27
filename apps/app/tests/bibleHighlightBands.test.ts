import { describe, expect, it } from 'vitest';

import { highlightBands } from '../src/features/bible/components/highlightBands';

const near = (v: number, want: number) => expect(v).toBeCloseTo(want, 2);

describe('faixas do marca-texto por linha (respiro entre linhas)', () => {
  it('19 px com entrelinhas 36,1: faixa de 28,12 centrada, sobrando 0,14 em de cada lado', () => {
    const [b] = highlightBands([{ x: 0, y: 0, width: 200, height: 36.1 }], 19, 36.1);
    near(b!.height, 28.12);
    near(b!.y, 3.99);
    near(b!.x, -2.66);
    near(b!.width, 205.32);
  });

  it('15 px com linha de 24: tira 6,3 px de respiro', () => {
    const [b] = highlightBands([{ x: 10, y: 48, width: 100, height: 24 }], 15, 24);
    near(b!.height, 17.7);
    near(b!.y, 48 + 3.15);
  });

  it('o respiro nunca é menor que 4 px', () => {
    const [b] = highlightBands([{ x: 0, y: 0, width: 50, height: 16 }], 8, 16);
    near(b!.height, 12);
  });

  it('linha vazia (largura 0) não ganha faixa', () => {
    expect(highlightBands([{ x: 0, y: 0, width: 0, height: 36 }], 19, 36)).toEqual([]);
  });

  it('entre a faixa de uma linha e a da seguinte sobra exatamente o respiro', () => {
    const [a, b] = highlightBands(
      [
        { x: 0, y: 0, width: 200, height: 36.1 },
        { x: 0, y: 36.1, width: 120, height: 36.1 },
      ],
      19,
      36.1,
    );
    near(b!.y - (a!.y + a!.height), 7.98);
  });
});
