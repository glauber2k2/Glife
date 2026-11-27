// Trocas de tela (router.replace) que significam "voltar" — capítulo anterior, voltar sem histórico — levam o
// parâmetro `volta=1`; a pilha raiz então anima a troca como um "voltar" (a tela sai pela direita e a anterior
// entra pela esquerda) em vez de como um avanço.
import { router, type Href } from 'expo-router';

import { asBackHref } from './navigationMotion';

/** Troca a tela atual animando como "voltar". */
export function replaceBack(href: Href) {
  router.replace(asBackHref(href));
}

/** Volta no histórico ou, sem histórico, troca pela tela de destino animando como "voltar". */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else replaceBack(fallback);
}
