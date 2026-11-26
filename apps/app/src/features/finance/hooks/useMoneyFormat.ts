import { useMemo } from 'react';

import { useMoneyVisibility } from '@/shared/lib/MoneyVisibility';

import { createMoneyFormat } from '../components/format';

/** `money`, `signed` e `balance` já com a escolha do olhinho (valores ocultos viram "R$ ••••"). */
export function useMoneyFormat() {
  const { hidden } = useMoneyVisibility();
  return useMemo(
    () => ({
      ...createMoneyFormat(hidden),
      hidden,
      /** Cor que depende do sinal do valor (vermelho/verde) também esconde o sinal: oculto, usa a neutra. */
      toneOf: <T,>(tone: T, neutral: T): T => (hidden ? neutral : tone),
    }),
    [hidden],
  );
}
