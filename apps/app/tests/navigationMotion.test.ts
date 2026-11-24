import { describe, expect, it } from 'vitest';

import {
  createTabFocusTracker,
  getTabDirection,
  getTabLineInsets,
  getTabLineMotion,
  resolveNavigationMotion,
  tabSceneEnterFrom,
} from '../src/shared/navigation/navigationMotion';

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

describe('troca de aba', () => {
  it('a direção segue a ordem das abas', () => {
    expect(getTabDirection(0, 2)).toBe(1);
    expect(getTabDirection(3, 1)).toBe(-1);
  });

  it('a primeira aba exibida não tem direção', () => {
    expect(getTabDirection(-1, 2)).toBe(0);
    expect(getTabDirection(2, -1)).toBe(0);
    expect(getTabDirection(2, 2)).toBe(0);
  });

  it('o rastreador lembra a última aba e dá a direção da próxima', () => {
    const tracker = createTabFocusTracker();
    expect(tracker.advance(0)).toBe(0);
    expect(tracker.advance(2)).toBe(1);
    expect(tracker.advance(1)).toBe(-1);
    expect(tracker.advance(1)).toBe(0);
  });

  it('a tela entra pelo lado do movimento', () => {
    expect(tabSceneEnterFrom(false, 1, 24)).toEqual({ opacity: 0, translateX: 24 });
    expect(tabSceneEnterFrom(false, -1, 24)).toEqual({ opacity: 0, translateX: -24 });
  });

  it('sem direção, só esmaece', () => {
    expect(tabSceneEnterFrom(false, 0, 24)).toEqual({ opacity: 0, translateX: 0 });
  });

  it('com "reduzir movimento" aparece direto', () => {
    expect(tabSceneEnterFrom(true, 1, 24)).toEqual({ opacity: 1, translateX: 0 });
  });
});

describe('linha da aba ativa', () => {
  it('fica sobre as quatro abas, recuada da borda de cada espaço, e pula a caixa de entrada', () => {
    // 500 px em 5 espaços de 100; recuo 22
    expect([0, 1, 2, 3].map((index) => getTabLineInsets(index, 4, 500, 22))).toEqual([
      { left: 22, right: 422 },
      { left: 122, right: 322 },
      { left: 322, right: 122 },
      { left: 422, right: 22 },
    ]);
  });

  it('acompanha o redimensionamento da barra', () => {
    expect(getTabLineInsets(2, 4, 1000, 22)).toEqual({ left: 622, right: 222 });
  });

  it('também reserva a caixa de entrada com quantidade ímpar de abas', () => {
    expect([0, 1, 2].map((index) => getTabLineInsets(index, 3, 400, 22))).toEqual([
      { left: 22, right: 322 },
      { left: 122, right: 222 },
      { left: 322, right: 22 },
    ]);
  });

  it('some antes de medir a barra ou quando não há aba ativa', () => {
    expect(getTabLineInsets(0, 4, 0, 22)).toBeNull();
    expect(getTabLineInsets(0, 0, 500, 22)).toBeNull();
    expect(getTabLineInsets(-1, 4, 500, 22)).toBeNull();
    expect(getTabLineInsets(4, 4, 500, 22)).toBeNull();
  });

  it('estica: a borda da frente vai na mola de toque e a de trás segue na de ênfase', () => {
    expect(getTabLineMotion(1)).toEqual({ left: 'trail', right: 'lead' });
    expect(getTabLineMotion(-1)).toEqual({ left: 'lead', right: 'trail' });
  });
});
