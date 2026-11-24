/** Opções específicas também precisam respeitar a preferência, pois sobrescrevem o stack. */
export function resolveNavigationMotion(reduceMotion: boolean) {
  return reduceMotion
    ? { stack: 'none', modal: 'none', detail: 'none' } as const
    : { stack: 'fade', modal: 'slide_from_bottom', detail: 'slide_from_right' } as const;
}

/**
 * Estado inicial da aba que ganha foco. Só esmaece: deslocar para o lado fazia a tela "arrastar" a cada troca.
 * Com "reduzir movimento" aparece direto.
 */
export function tabSceneEnterFrom(reduceMotion: boolean) {
  return { opacity: reduceMotion ? 1 : 0, translateX: 0 } as const;
}

/** A caixa de entrada ocupa um espaço no centro, mas nunca recebe o indicador de aba. */
export function getTabIndicatorOffset(index: number, tabCount: number, barWidth: number, indicatorWidth: number) {
  if (barWidth <= 0 || tabCount <= 0 || index < 0 || index >= tabCount) return null;
  const middle = Math.ceil(tabCount / 2);
  const slot = index < middle ? index : index + 1;
  const slotWidth = barWidth / (tabCount + 1);
  return slotWidth * (slot + 0.5) - indicatorWidth / 2;
}
