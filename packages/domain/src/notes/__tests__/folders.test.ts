import { describe, expect, it } from 'vitest';

import { folderBreadcrumbs, folderChildren, folderDestinations, folderPath } from '../folders.ts';
import type { NoteFolder } from '../model.ts';

const folder = (id: string, name: string, parent_id: string | null = null): NoteFolder => ({ id, name, parent_id, user_id: 'owner', created_at: '2026-11-26T12:00:00Z', updated_at: '2026-11-26T12:00:00Z', deleted_at: null });
const folders = [folder('a', 'Casa'), folder('b', 'Documentos', 'a'), folder('c', 'Contas', 'b'), folder('d', 'Trabalho'), folder('e', 'Documentos', 'd')];

describe('navegação por subpastas', () => {
  it('lista somente raízes ou filhos diretos', () => {
    expect(folderChildren(folders, null).map((f) => f.id)).toEqual(['a', 'd']);
    expect(folderChildren(folders, 'a').map((f) => f.id)).toEqual(['b']);
    expect(folderChildren(folders, 'b').map((f) => f.id)).toEqual(['c']);
  });

  it('distingue nomes repetidos pelo caminho e mantém ids para navegar acima', () => {
    expect(folderPath(folders, 'b')).toBe('Casa / Documentos');
    expect(folderPath(folders, 'e')).toBe('Trabalho / Documentos');
    expect(folderBreadcrumbs(folders, 'c').map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(folderPath(folders, 'ausente')).toBe('');
  });

  it('não oferece mover uma pasta para ela mesma nem para seus descendentes', () => {
    expect(folderDestinations(folders, 'a').map((f) => f.folder.id)).toEqual(['d', 'e']);
    expect(folderDestinations(folders).map((f) => f.path)).toEqual(['Casa', 'Casa / Documentos', 'Casa / Documentos / Contas', 'Trabalho', 'Trabalho / Documentos']);
  });

  it('promove órfãos à raiz e ignora pastas excluídas na apresentação', () => {
    const all = [...folders, folder('o', 'Órfã', 'ausente'), { ...folder('x', 'Excluída'), deleted_at: '2026-11-26T13:00:00Z' }, folder('y', 'Sem pai ativo', 'x')];
    expect(folderChildren(all, null).map((f) => f.id)).toEqual(['a', 'o', 'y', 'd']);
    expect(folderPath(all, 'y')).toBe('Sem pai ativo');
    expect(folderDestinations(all).some((f) => f.folder.id === 'x')).toBe(false);
  });

  it('um ciclo recebido do sync continua navegável e nunca vira recursão infinita', () => {
    const all = [folder('b', 'B', 'a'), folder('a', 'A', 'b'), folder('c', 'C', 'b')];
    expect(folderChildren(all, null).map((f) => f.id)).toEqual(['a']);
    expect(folderPath(all, 'c')).toBe('A / B / C');
    expect(folderChildren(all, 'b').map((f) => f.id)).toEqual(['c']);
    // Mover para uma cadeia ainda cíclica seria recusado pelo repositório.
    expect(folderDestinations(all, 'c')).toEqual([]);
  });

  it('caminhos profundos não dependem da pilha de chamadas', () => {
    const deep = Array.from({ length: 3000 }, (_, i) => folder(String(i), 'P', i ? String(i - 1) : null));
    expect(folderBreadcrumbs(deep, '2999')).toHaveLength(3000);
  });
});
