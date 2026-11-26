import { describe, expect, it } from 'vitest';

import { liveSpans } from '../src/features/notes/components/liveMarkdown';

const join = (md: string) => liveSpans(md).map((s) => s.text).join('');

describe('markdown ao vivo no campo de escrever', () => {
  it('juntar os trechos devolve o texto exato', () => {
    const samples = [
      '',
      '# Título\n## Sub\ntexto **negrito** e *itálico*\n\n- item\n1. um\n> citação — Rm 8',
      'a ++b++ ~~c~~ ==d== [[Nota]] [x](https://a.b) **sem fim',
      '***x*** * solto ** == ~~',
      '- item\n\n  ',
      '- item\n\n  **texto**\r\n\r\n😀 ++fim++',
    ];
    for (const md of samples) expect(join(md)).toBe(md);
  });

  it('reconstrói cada etapa ao inserir espaços, voltar o cursor e apagar uma lista', () => {
    const steps = ['- item', '- item\n', '- item\n\n', '- item\n\n ', '- item\n\n  ', '- **item**\n\n  ', '- item\n\n  ', '\n\n  ', '  ', ''];
    for (const text of steps) expect(join(text)).toBe(text);
  });

  it('marcações ficam apagadas e o conteúdo com o estilo', () => {
    expect(liveSpans('a **b** ==c==')).toEqual([
      { text: 'a ', styles: [] },
      { text: '**', styles: ['bold', 'mark'] },
      { text: 'b', styles: ['bold'] },
      { text: '**', styles: ['bold', 'mark'] },
      { text: ' ', styles: [] },
      { text: '==', styles: ['highlight', 'mark'] },
      { text: 'c', styles: ['highlight'] },
      { text: '==', styles: ['highlight', 'mark'] },
    ]);
  });

  it('título e subtítulo estilizam a linha inteira', () => {
    expect(liveSpans('# A *b*')).toEqual([
      { text: '# ', styles: ['h1', 'mark'] },
      { text: 'A ', styles: ['h1'] },
      { text: '*', styles: ['h1', 'italic', 'mark'] },
      { text: 'b', styles: ['h1', 'italic'] },
      { text: '*', styles: ['h1', 'italic', 'mark'] },
    ]);
    expect(liveSpans('## Sub')[1]).toEqual({ text: 'Sub', styles: ['h2'] });
  });

  it('marcador de lista não vira itálico', () => {
    expect(liveSpans('* item')).toEqual([
      { text: '* ', styles: ['bullet'] },
      { text: 'item', styles: [] },
    ]);
  });
});
