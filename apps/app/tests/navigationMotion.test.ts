import { describe, expect, it } from 'vitest';

import { getTabIndicatorOffset, resolveNavigationMotion } from '../src/shared/navigation/navigationMotion';

describe('acessibilidade da navegação', () => {
  it('desliga todas as transições, incluindo opções específicas de modal e detalhe', () => {
    expect(resolveNavigationMotion(true)).toEqual({
      stack: 'none',
      modal: 'none',
      detail: 'none',
    });
  });

  it('restaura as transições quando a preferência de movimento é desligada', () => {
    resolveNavigationMotion(true);
    expect(resolveNavigationMotion(false)).toEqual({
      stack: 'fade',
      modal: 'slide_from_bottom',
      detail: 'slide_from_right',
    });
  });
});

describe('indicador da aba ativa', () => {
  it('centraliza nas quatro abas e pula o botão da caixa de entrada', () => {
    expect([0, 1, 2, 3].map((index) => getTabIndicatorOffset(index, 4, 500, 24)))
      .toEqual([38, 138, 338, 438]);
  });

  it('acompanha o redimensionamento da barra', () => {
    expect(getTabIndicatorOffset(2, 4, 1000, 24)).toBe(688);
    expect(getTabIndicatorOffset(2, 4, 500, 24)).toBe(338);
  });

  it('também reserva a caixa de entrada com quantidade ímpar de abas', () => {
    expect([0, 1, 2].map((index) => getTabIndicatorOffset(index, 3, 400, 24)))
      .toEqual([38, 138, 338]);
  });

  it('esconde o indicador antes de medir a barra ou quando não há aba ativa', () => {
    expect(getTabIndicatorOffset(0, 4, 0, 24)).toBeNull();
    expect(getTabIndicatorOffset(0, 0, 500, 24)).toBeNull();
    expect(getTabIndicatorOffset(-1, 4, 500, 24)).toBeNull();
    expect(getTabIndicatorOffset(4, 4, 500, 24)).toBeNull();
  });
});
