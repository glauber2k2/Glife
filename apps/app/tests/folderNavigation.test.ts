import { describe, expect, it } from 'vitest';

import { folderUpAction } from '../src/features/notes/hooks/folderNavigation';

const pastas = { name: 'pastas' };
const pasta = (id: string) => ({ name: 'pasta/[id]', params: { id } });

describe('subir de pasta sem duplicar telas', () => {
  it('volta quando a tela anterior já é a pasta mãe', () => {
    expect(folderUpAction({ index: 2, routes: [pastas, pasta('A'), pasta('B')] }, 'A')).toBe('back');
  });

  it('volta para a lista de pastas quando a pasta é de topo e veio de lá', () => {
    expect(folderUpAction({ index: 1, routes: [pastas, pasta('A')] }, null)).toBe('back');
  });

  it('troca a tela quando a anterior não é a mãe (link direto, outra tela ou recarga no web)', () => {
    expect(folderUpAction({ index: 0, routes: [pasta('B')] }, 'A')).toBe('replace');
    expect(folderUpAction({ index: 1, routes: [{ name: 'nota/[id]', params: { id: 'n' } }, pasta('B')] }, 'A')).toBe('replace');
    expect(folderUpAction({ index: 1, routes: [pasta('C'), pasta('B')] }, 'A')).toBe('replace');
    expect(folderUpAction({ index: 1, routes: [pasta('A'), pasta('B')] }, null)).toBe('replace');
    expect(folderUpAction(undefined, 'A')).toBe('replace');
  });
});
