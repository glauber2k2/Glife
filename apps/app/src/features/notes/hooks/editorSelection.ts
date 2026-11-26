// Cursor do editor de notas, puro e testável. Guarda a seleção crua do evento nativo: no Android ele pode chegar
// antes do texto novo, e limitar ao texto antigo atrasaria o cursor um caractere. Só normaliza na hora de usar.
import { normalizeSelection, type Edit, type Selection } from '../components/textEdits';

export interface EditorSelection {
  /** Última seleção informada (nativa ou de uma edição), sem limitar ao texto. */
  raw: Selection;
  /** Seleção imposta ao campo depois de uma edição da barra/[[; some no próximo evento nativo ou digitação. */
  forced?: Selection;
}

export type EditorSelectionAction =
  | { type: 'native'; selection: Selection }
  | { type: 'text' }
  | { type: 'edit'; edit: Edit };

export const initialEditorSelection: EditorSelection = { raw: { start: 0, end: 0 } };

export function editorSelectionReducer(state: EditorSelection, action: EditorSelectionAction): EditorSelection {
  switch (action.type) {
    case 'native':
      return { raw: { start: action.selection.start, end: action.selection.end } };
    case 'text':
      return state.forced ? { raw: state.raw } : state;
    case 'edit': {
      const selection = normalizeSelection(action.edit.text, action.edit.selection);
      return { raw: selection, forced: selection };
    }
  }
}

/** Seleção válida para o texto atual. */
export const cursorIn = (text: string, state: EditorSelection): Selection => normalizeSelection(text, state.raw);
