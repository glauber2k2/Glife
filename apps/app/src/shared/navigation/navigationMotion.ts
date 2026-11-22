/** Opções específicas também precisam respeitar a preferência, pois sobrescrevem o stack. */
export function resolveNavigationMotion(reduceMotion: boolean) {
  return reduceMotion
    ? { stack: 'none', modal: 'none', detail: 'none' } as const
    : { stack: 'fade', modal: 'slide_from_bottom', detail: 'slide_from_right' } as const;
}

/** A caixa de entrada ocupa um espaço no centro, mas nunca recebe o indicador de aba. */
export function getTabIndicatorOffset(index: number, tabCount: number, barWidth: number, indicatorWidth: number) {
  if (barWidth <= 0 || tabCount <= 0 || index < 0 || index >= tabCount) return null;
  const middle = Math.ceil(tabCount / 2);
  const slot = index < middle ? index : index + 1;
  const slotWidth = barWidth / (tabCount + 1);
  return slotWidth * (slot + 0.5) - indicatorWidth / 2;
}
