import { chartPeriod } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import {
  axisIndices,
  compactMoney,
  monthBounds,
  outflow,
  periodLabel,
  previousLabel,
  sharePct,
  signedPct,
} from '../src/features/finance/components/charts/chartFormat';
import { createMoneyFormat } from '../src/features/finance/components/format';

describe('textos dos gráficos', () => {
  it('período e período anterior', () => {
    expect(periodLabel(chartPeriod('6m', '2026-11'))).toBe('Junho a novembro de 2026');
    expect(periodLabel(chartPeriod('12m', '2026-11'))).toBe('Dezembro de 2025 a novembro de 2026');
    expect(periodLabel(chartPeriod('month', '2026-11'))).toBe('Novembro de 2026');
    expect(previousLabel(chartPeriod('6m', '2026-11'))).toBe('dezembro a maio');
    expect(previousLabel(chartPeriod('month', '2026-11'))).toBe('outubro');
    expect(previousLabel(chartPeriod('12m', '2026-11'))).toBeNull();
  });

  it('valor curto da referência', () => {
    expect(compactMoney(50000)).toBe('R$ 500');
    expect(compactMoney(1000000)).toBe('R$ 10 mil');
    expect(compactMoney(150000000)).toBe('R$ 1,5 mi');
    expect(compactMoney(200000000)).toBe('R$ 2 mi');
  });

  it('percentuais e saídas', () => {
    expect(sharePct(0.43)).toBe('43%');
    expect(sharePct(0.001)).toBe('<1%');
    expect(signedPct(0.1234)).toBe('+12,3%');
    expect(signedPct(-0.04)).toBe('−4,0%');
    expect(outflow(1990, createMoneyFormat(false))).toBe('− R$ 19,90');
    expect(outflow(-1000, createMoneyFormat(false))).toBe('+ R$ 10,00');
  });

  it('eixo e limites do mês', () => {
    expect([...axisIndices(6)]).toEqual([0, 2, 5]);
    expect([...axisIndices(3)]).toEqual([0, 1, 2]);
    expect(monthBounds('2026-06', '2026-11')).toEqual({ min: '2026-05', max: '2026-11' });
    expect(monthBounds(null, '2026-11')).toEqual({ min: '2026-11', max: '2026-11' });
  });
});
