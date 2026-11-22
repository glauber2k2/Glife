import { spring } from './theme/tokens';

export type SpringKind = keyof typeof spring;

/** Configuração pura, compartilhada pelos componentes e testável sem React Native. */
export function resolveSpring(kind: SpringKind, reduceMotion: boolean) {
  return reduceMotion ? null : spring[kind];
}
