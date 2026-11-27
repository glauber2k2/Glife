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

describe('quebras de linha no markdown ao vivo (linhas vazias depois de lista)', () => {
  const samples = ['- a\n\n', '- a\n\n\n', '- item\n\n  ', '1. um\n\n', '# T\n\ntexto', '\n\n- a', 'a\n\nb', '- **a**\n\n\n> q\n\n'];

  it('nenhum trecho começa com quebra de linha (a quebra fica no fim da linha dela)', () => {
    for (const md of samples) {
      const spans = liveSpans(md);
      spans.forEach((span, i) => {
        if (i > 0) expect(span.text.startsWith('\n'), `${JSON.stringify(md)} trecho ${i}`).toBe(false);
      });
    }
  });

  it('não sobram trechos só de quebras nem trechos vizinhos com o mesmo estilo', () => {
    for (const md of samples) {
      const spans = liveSpans(md);
      expect(spans.map((s) => s.text).join('')).toBe(md);
      spans.forEach((span, i) => {
        expect(span.text.length).toBeGreaterThan(0);
        if (i > 0) expect(span.styles.join()).not.toBe(spans[i - 1]!.styles.join());
        if (i > 0) expect(/^\n+$/.test(span.text)).toBe(false);
      });
    }
  });

  it('duas linhas vazias depois de uma lista ficam no trecho do item', () => {
    expect(liveSpans('- a\n\n')).toEqual([
      { text: '- ', styles: ['bullet'] },
      { text: 'a\n\n', styles: [] },
    ]);
    expect(liveSpans('- \n\n')).toEqual([{ text: '- \n\n', styles: ['bullet'] }]);
  });

  it('a quebra do título fica com o título (mesma altura de linha)', () => {
    expect(liveSpans('# T\nx')).toEqual([
      { text: '# ', styles: ['h1', 'mark'] },
      { text: 'T\n', styles: ['h1'] },
      { text: 'x', styles: [] },
    ]);
  });

  it('texto que começa com linhas vazias tem um único trecho inicial de quebras', () => {
    expect(liveSpans('\n\n- a')).toEqual([
      { text: '\n\n', styles: [] },
      { text: '- ', styles: ['bullet'] },
      { text: 'a', styles: [] },
    ]);
  });
});
