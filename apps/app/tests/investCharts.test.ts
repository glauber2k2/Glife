import { describe, expect, it } from 'vitest';

import { donutArcs, lineGeometry, nearestValid, nextSelection, pathOf, rankBars } from '../src/features/finance/components/charts/investGeometry';

describe('linha da carteira', () => {
  it('valores nulos no começo não entram no desenho nem na escala', () => {
    const g = lineGeometry([[null, null, 10, 20, 30]], { width: 100, height: 50, pad: 5 });
    expect(g.ys[0]!.slice(0, 2)).toEqual([null, null]);
    expect(g.ys[0]![2]).toBe(45); // mínimo embaixo
    expect(g.ys[0]![4]).toBe(5); // máximo em cima
    expect(pathOf(g.xs, g.ys[0]!)).toBe('M50.0 45.0L75.0 25.0L100.0 5.0');
  });

  it('a linha de referência entra na escala', () => {
    const g = lineGeometry([[10, 10]], { width: 100, height: 50, pad: 5, reference: 30 });
    expect(g.refY).toBe(5);
    expect(g.ys[0]![0]).toBe(45);
  });

  it('série constante fica no meio, sem dividir por zero', () => {
    const g = lineGeometry([[7, 7, 7]], { width: 100, height: 50, pad: 5 });
    expect(g.ys[0]).toEqual([25, 25, 25]);
  });

  it('o toque escolhe o ponto válido mais próximo', () => {
    const g = lineGeometry([[null, null, 10, 20, 30]], { width: 100, height: 50, pad: 5 });
    expect(nearestValid(g.xs, g.ys[0]!, 0.05)).toBe(2);
    expect(nearestValid(g.xs, g.ys[0]!, 0.8)).toBe(3);
  });
});

describe('rosca', () => {
  it('fatias com espaço entre elas, na ordem dada, sem fatia vazia', () => {
    const arcs = donutArcs(
      [
        { key: 'a', value: 75 },
        { key: 'b', value: 0 },
        { key: 'c', value: 25 },
      ],
      100,
      2,
    );
    expect(arcs.map((a) => a.key)).toEqual(['a', 'c']);
    expect(arcs[0]).toEqual({ key: 'a', length: 73, offset: 0 });
    expect(arcs[1]).toEqual({ key: 'c', length: 23, offset: -75 });
  });

  it('tocar de novo na fatia escolhida desmarca', () => {
    expect(nextSelection(null, 'a')).toBe('a');
    expect(nextSelection('a', 'a')).toBeNull();
    expect(nextSelection('a', 'b')).toBe('b');
  });
});

describe('barras do ranking', () => {
  it('divergente: positivo à direita do zero, negativo à esquerda', () => {
    const bars = rankBars([10, -5], true);
    expect(bars[0]).toEqual({ start: 0.5, size: 0.5, negative: false });
    expect(bars[1]).toEqual({ start: 0.25, size: 0.25, negative: true });
  });

  it('simples: do começo, proporcional ao maior', () => {
    expect(rankBars([8, 2], false)).toEqual([
      { start: 0, size: 1, negative: false },
      { start: 0, size: 0.25, negative: false },
    ]);
  });
});
