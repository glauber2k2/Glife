/** Opções específicas também precisam respeitar a preferência, pois sobrescrevem o stack. */
export function resolveNavigationMotion(reduceMotion: boolean) {
  return reduceMotion
    ? { stack: 'none', modal: 'none', detail: 'none' } as const
    : { stack: 'fade', modal: 'slide_from_bottom', detail: 'slide_from_right' } as const;
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
 * Estado inicial da aba que ganha foco: entra pelo lado do movimento enquanto esmaece.
 * Sem direção só esmaece; com "reduzir movimento" aparece direto.
 */
export function tabSceneEnterFrom(reduceMotion: boolean, direction: TabDirection, distance: number) {
  if (reduceMotion) return { opacity: 1, translateX: 0 } as const;
  return { opacity: 0, translateX: direction * distance } as const;
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
