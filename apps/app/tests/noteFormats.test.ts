import { describe, expect, it } from 'vitest';

import { noteExcerpt } from '../src/features/notes/components/excerpt';
import { parseInline, parseMarkdown } from '../src/features/notes/components/markdown';
import { toggleHeading, toggleWrap } from '../src/features/notes/components/textEdits';

describe('formatos de trecho no markdown', () => {
  it('lê itálico, sublinhado, tachado e marca-texto sem confundir com negrito', () => {
    expect(parseInline('a **b** *c* ++d++ ~~e~~ ==f==')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'c' },
      { type: 'text', text: ' ' },
      { type: 'underline', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'strike', text: 'e' },
      { type: 'text', text: ' ' },
      { type: 'highlight', text: 'f' },
    ]);
  });

  it('título e subtítulo viram níveis 1 e 2', () => {
    expect(parseMarkdown('# A\n## B').map((b) => (b.type === 'heading' ? b.level : 0))).toEqual([1, 2]);
  });

  it('a prévia da lista tira as marcações novas', () => {
    expect(noteExcerpt('++sub++ ==marca== ~~fora~~')).toBe('sub marca fora');
  });
});

describe('barra de formatação: estilos e títulos', () => {
  it('envolve e tira a marcação', () => {
    expect(toggleWrap('um dois', { start: 3, end: 7 }, '==')).toEqual({ text: 'um ==dois==', selection: { start: 5, end: 9 } });
    expect(toggleWrap('um ==dois==', { start: 5, end: 9 }, '==')).toEqual({ text: 'um dois', selection: { start: 3, end: 7 } });
  });

  it('itálico dentro de negrito acrescenta, não desfaz o negrito', () => {
    expect(toggleWrap('**x**', { start: 2, end: 3 }, '*').text).toBe('***x***');
    expect(toggleWrap('*x*', { start: 1, end: 2 }, '*').text).toBe('x');
  });

  it('título liga, troca de nível e desliga', () => {
    expect(toggleHeading('Linha', { start: 2, end: 2 }, 1)).toEqual({ text: '# Linha', selection: { start: 4, end: 4 } });
    expect(toggleHeading('# Linha', { start: 4, end: 4 }, 2)).toEqual({ text: '## Linha', selection: { start: 5, end: 5 } });
    expect(toggleHeading('## Linha', { start: 5, end: 5 }, 2)).toEqual({ text: 'Linha', selection: { start: 2, end: 2 } });
  });

  it('só mexe na linha do cursor', () => {
    expect(toggleHeading('a\nb\nc', { start: 2, end: 3 }, 1).text).toBe('a\n# b\nc');
  });
});
