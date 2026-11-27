import { describe, expect, it } from 'vitest';
import type { Href } from 'expo-router';

import {
  asBackHref,
  createTabFocusTracker,
  isTabBarHidden,
  getTabDirection,
  getTabIndicatorX,
  getTabLineInsets,
  getTabLineMotion,
  isBackParams,
  replaceAnimationFor,
  resolveNavigationMotion,
  tabSceneEnterFrom,
  tabSceneOffset,
} from '../src/shared/navigation/navigationMotion';

describe('acessibilidade da navegação', () => {
  it('com "reduzir movimento" toda transição vira esmaecer, incluindo modal e detalhe', () => {
    expect(resolveNavigationMotion(true)).toEqual({
      stack: 'fade',
      modal: 'fade',
      detail: 'fade',
    });
  });

  it('restaura as transições quando a preferência de movimento é desligada', () => {
    resolveNavigationMotion(true);
    expect(resolveNavigationMotion(false)).toEqual({
      stack: 'fade',
      modal: 'slide_from_bottom',
      detail: 'ios_from_right',
    });
  });
});

describe('voltar por troca de tela', () => {
  it('marca o endereço com volta=1 (texto, com ou sem consulta, e objeto)', () => {
    expect(asBackHref('/biblia/GEN/2' as Href)).toBe('/biblia/GEN/2?volta=1');
    expect(asBackHref('/biblia/GEN/2?plano=x' as Href)).toBe('/biblia/GEN/2?plano=x&volta=1');
    expect(asBackHref({ pathname: '/pasta/[id]', params: { id: 'a' } })).toEqual({ pathname: '/pasta/[id]', params: { id: 'a', volta: '1' } });
  });

  it('a pilha anima a troca marcada como voltar e as outras como avanço', () => {
    expect(isBackParams({ volta: '1' })).toBe(true);
    expect(isBackParams({})).toBe(false);
    expect(isBackParams(undefined)).toBe(false);
    expect(replaceAnimationFor(true)).toBe('pop');
    expect(replaceAnimationFor(false)).toBe('push');
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

  it('a primeira aba esmaece e cresce de 0,94, sem direção', () => {
    expect(tabSceneEnterFrom(false)).toEqual({ opacity: 0, scale: 0.94 });
  });

  it('a aba escolhida entra do seu lado: à direita vem da direita, à esquerda vem da esquerda', () => {
    expect(tabSceneEnterFrom(false, 1)).toEqual({ opacity: 0, scale: 0.98 });
    expect(tabSceneOffset(1, false, 400, 0.08)).toBe(32);
    expect(tabSceneOffset(-1, false, 400, 0.08)).toBe(-32);
    expect(tabSceneOffset(0, false, 400, 0.08)).toBe(0);
    expect(tabSceneOffset(1, true, 400, 0.08)).toBe(0);
  });

  it('a pílula da aba ativa fica centrada na casa (o + ocupa o meio)', () => {
    expect(getTabIndicatorX(0, 4, 500, 52)).toBe(24);
    expect(getTabIndicatorX(2, 4, 500, 52)).toBe(324);
    expect(getTabIndicatorX(0, 4, 0, 52)).toBeNull();
  });

  it('com "reduzir movimento" só esmaece', () => {
    expect(tabSceneEnterFrom(true)).toEqual({ opacity: 0, scale: 1 });
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

describe('isTabBarHidden', () => {
  it('só esconde com tabBarStyle display none', () => {
    expect(isTabBarHidden(undefined)).toBe(false);
    expect(isTabBarHidden({})).toBe(false);
    expect(isTabBarHidden({ tabBarStyle: { display: 'flex' } })).toBe(false);
    expect(isTabBarHidden({ tabBarStyle: { display: 'none' } })).toBe(true);
  });
});
