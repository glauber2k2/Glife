import type { Href } from 'expo-router';

/**
 * Opções específicas também precisam respeitar a preferência, pois sobrescrevem o stack.
 * `detail` empurra a nova tela da direita com a anterior recuando em paralaxe (e o voltar faz o caminho inverso);
 * `stack` (abas, entrada, verificação) só esmaece; `modal` sobe de baixo.
 */
export function resolveNavigationMotion(reduceMotion: boolean) {
  return reduceMotion
    ? ({ stack: 'fade', modal: 'fade', detail: 'fade' } as const)
    : ({ stack: 'fade', modal: 'slide_from_bottom', detail: 'ios_from_right' } as const);
}

/** Troca de tela (replace) marcada como "voltar" anima como voltar; as outras, como avanço. */
export function replaceAnimationFor(isBack: boolean) {
  return isBack ? ('pop' as const) : ('push' as const);
}

/** Deslocamento (fração da largura) de onde a aba nova entra: do lado da aba escolhida. */
export function tabSceneOffset(direction: TabDirection, reduceMotion: boolean, width: number, fraction: number) {
  if (reduceMotion || direction === 0) return 0;
  return direction * width * fraction;
}

/** 1 = indo para a direita, −1 = para a esquerda, 0 = primeira aba exibida (sem lado). */
export type TabDirection = -1 | 0 | 1;

export function getTabDirection(fromIndex: number, toIndex: number): TabDirection {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 0;
  return toIndex > fromIndex ? 1 : -1;
}

/** Lembra a última aba exibida para dizer de que lado vem a próxima (compartilhado pelas telas de um navegador). */
export function createTabFocusTracker() {
  let last = -1;
  return {
    advance(index: number): TabDirection {
      const direction = getTabDirection(last, index);
      last = index;
      return direction;
    },
  };
}
export type TabFocusTracker = ReturnType<typeof createTabFocusTracker>;

/**
 * Estado inicial da aba que ganha foco: esmaece e cresce de leve (0,98) enquanto desliza do lado da aba escolhida.
 * Sem direção (primeira aba) cresce de 0,94. Com "reduzir movimento" só esmaece.
 */
export function tabSceneEnterFrom(reduceMotion: boolean, direction: TabDirection = 0) {
  if (reduceMotion) return { opacity: 0, scale: 1 } as const;
  return direction === 0 ? ({ opacity: 0, scale: 0.94 } as const) : ({ opacity: 0, scale: 0.98 } as const);
}

/** A caixa de entrada ocupa um espaço no centro, mas nunca recebe a linha da aba ativa. */
function getTabSlot(index: number, tabCount: number) {
  const middle = Math.ceil(tabCount / 2);
  return index < middle ? index : index + 1;
}

/** Distâncias (px) das bordas da linha até as bordas da barra; `inset` recua a linha dentro do espaço da aba. */
export function getTabLineInsets(index: number, tabCount: number, barWidth: number, inset: number) {
  if (barWidth <= 0 || tabCount <= 0 || index < 0 || index >= tabCount) return null;
  const slots = tabCount + 1;
  const slot = getTabSlot(index, tabCount);
  const slotWidth = barWidth / slots;
  return { left: slot * slotWidth + inset, right: (slots - 1 - slot) * slotWidth + inset };
}

/**
 * A linha estica e recolhe: a borda do lado para onde vai parte primeiro (mola de toque)
 * e a outra segue depois (mola de ênfase, com atraso).
 */
export function getTabLineMotion(direction: TabDirection) {
  return direction < 0 ? ({ left: 'lead', right: 'trail' } as const) : ({ left: 'trail', right: 'lead' } as const);
}

/** Posição x (px) da pílula da aba ativa: centrada na casa da aba (o + ocupa a casa do meio). */
export function getTabIndicatorX(index: number, tabCount: number, barWidth: number, indicatorWidth: number) {
  if (barWidth <= 0 || tabCount <= 0 || index < 0 || index >= tabCount) return null;
  const slots = tabCount + 1;
  const slotWidth = barWidth / slots;
  return getTabSlot(index, tabCount) * slotWidth + (slotWidth - indicatorWidth) / 2;
}

/** A tela ativa pediu para esconder as abas (`tabBarStyle: { display: 'none' }`, padrão do React Navigation). */
export function isTabBarHidden(options: { tabBarStyle?: unknown } | undefined): boolean {
  const style = options?.tabBarStyle;
  return !!style && typeof style === 'object' && (style as { display?: unknown }).display === 'none';
}

// Troca de tela (replace) que significa "voltar" leva `volta=1`; a pilha raiz anima a troca como voltar.
export const BACK_PARAM = 'volta';

/** O endereço com `volta=1` (texto ou objeto com params). */
export function asBackHref(href: Href): Href {
  if (typeof href === 'string') {
    const [path, hash] = href.split('#') as [string, string | undefined];
    const withParam = `${path}${path.includes('?') ? '&' : '?'}${BACK_PARAM}=1`;
    return (hash === undefined ? withParam : `${withParam}#${hash}`) as Href;
  }
  const obj = href as { pathname: string; params?: Record<string, unknown> };
  return { ...obj, params: { ...obj.params, [BACK_PARAM]: '1' } } as Href;
}

/** A rota chegou por uma troca de "voltar"? */
export function isBackParams(params: object | undefined): boolean {
  return (params as Record<string, unknown> | undefined)?.[BACK_PARAM] === '1';
}
