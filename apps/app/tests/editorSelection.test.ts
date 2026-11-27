import { describe, expect, it } from 'vitest';

import { insertAt, toggleWrap } from '../src/features/notes/components/textEdits';
import { cursorIn, editorSelectionReducer, initialEditorSelection } from '../src/features/notes/hooks/editorSelection';

describe('cursor do editor de notas', () => {
  it('não atrasa um caractere quando a seleção nativa chega antes do texto novo (Android)', () => {
    let state = editorSelectionReducer(initialEditorSelection, { type: 'native', selection: { start: 2, end: 2 } });
    // Digitou "c" depois de "ab": o evento de seleção chega com o texto antigo ainda no estado.
    state = editorSelectionReducer(state, { type: 'native', selection: { start: 3, end: 3 } });
    expect(cursorIn('ab', state)).toEqual({ start: 2, end: 2 });
    state = editorSelectionReducer(state, { type: 'text' });
    expect(cursorIn('abc', state)).toEqual({ start: 3, end: 3 });
    // A formatação e o [[ entram na posição certa, depois do "c".
    expect(insertAt('abc', cursorIn('abc', state), '[[').text).toBe('abc[[');
    expect(toggleWrap('abc', cursorIn('abc', state), '**').text).toBe('abc****');
  });

  it('também funciona na ordem texto → seleção', () => {
    let state = editorSelectionReducer(initialEditorSelection, { type: 'native', selection: { start: 2, end: 2 } });
    state = editorSelectionReducer(state, { type: 'text' });
    state = editorSelectionReducer(state, { type: 'native', selection: { start: 3, end: 3 } });
    expect(cursorIn('abc', state)).toEqual({ start: 3, end: 3 });
  });

  it('edição aplicada força a seleção até o próximo evento nativo ou digitação', () => {
    let state = editorSelectionReducer(initialEditorSelection, { type: 'edit', edit: { text: 'a****', selection: { start: 3, end: 3 } } });
    expect(state.forced).toEqual({ start: 3, end: 3 });
    expect(cursorIn('a****', state)).toEqual({ start: 3, end: 3 });
    state = editorSelectionReducer(state, { type: 'native', selection: { start: 1, end: 1 } });
    expect(state.forced).toBeUndefined();
    const typed = editorSelectionReducer(editorSelectionReducer(initialEditorSelection, { type: 'edit', edit: { text: 'x', selection: { start: 1, end: 1 } } }), { type: 'text' });
    expect(typed.forced).toBeUndefined();
  });

  it('cursor além do texto encurtado é limitado só na hora de usar', () => {
    const state = editorSelectionReducer(initialEditorSelection, { type: 'native', selection: { start: 9, end: 9 } });
    expect(state.raw).toEqual({ start: 9, end: 9 });
    expect(cursorIn('abc', state)).toEqual({ start: 3, end: 3 });
  });
});
