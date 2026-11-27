// "Pasta acima": volta quando a tela anterior já é a mãe; senão troca a tela atual pela mãe.
// Trocar sempre (`replace`) empilhava a mãe por cima dela mesma ([Pastas, A, A]).

interface StackRoute {
  name: string;
  params?: object;
}

interface StackState {
  index: number;
  routes: readonly StackRoute[];
}

/** `parentId` null = a mãe é a lista de pastas. */
export function folderUpAction(state: StackState | undefined, parentId: string | null): 'back' | 'replace' {
  const previous = state && state.index > 0 ? state.routes[state.index - 1] : undefined;
  if (!previous) return 'replace';
  if (parentId === null) return previous.name === 'pastas' ? 'back' : 'replace';
  const id = (previous.params as { id?: unknown } | undefined)?.id;
  return previous.name === 'pasta/[id]' && id === parentId ? 'back' : 'replace';
}
