import { createElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Exercita a fronteira de texto do componente real sem carregar o runtime do Android.
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, Text: ({ children, style }: { children?: ReactNode; style?: unknown }) => {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (isValidElement(child)) continue;
    if (typeof child !== 'string') throw new Error('Unexpected text child');
  }
  return createElement('span', { 'data-styled': !!style }, children);
} }));
vi.mock('@/shared/ui', () => ({ makeStyles: (fn: (theme: unknown) => unknown) => () => fn({
  type: { body: { font: 'body', fontSize: 16, lineHeight: 24 }, heading: { font: 'heading', fontSize: 20, lineHeight: 26 }, item: { font: 'item', fontSize: 15 }, button: { font: 'button' } },
  space: { 2: 8 }, colors: { text: 'black', textSecondary: 'gray', textTertiary: 'silver', accentInk: 'blue', highlight: { yellow: 'yellow' } },
}) }));

import { editorLineHeight } from '../src/features/notes/components/editorLineHeight';
import { LiveMarkdown } from '../src/features/notes/components/LiveMarkdownText';

describe('árvore de texto nativa do Markdown ao vivo', () => {
  it('mantém uma só raiz de texto ao alternar entre conteúdo formatado, simples e vazio', () => {
    // Chama por um invólucro para preservar os hooks ao inspecionar o resultado do componente.
    function Inspect({ text }: { text: string }) {
      const result = LiveMarkdown({ markdown: text });
      expect(isValidElement(result)).toBe(true);
      const root = result as ReactElement<{ children?: ReactNode; style?: unknown }>;
      expect(root.props.style).toBeTruthy();
      return root;
    }
    for (const text of ['- item\n\n  ', '# Título\n\n**a**\n', 'texto', '']) {
      const html = renderToStaticMarkup(createElement(Inspect, { text }));
      expect(html.replace(/<[^>]+>/g, '')).toBe(text);
    }
  });

  it('no Android o campo de escrever não fixa entrelinha (ela fazia o texto pular a cada tecla com linhas vazias)', () => {
    expect(editorLineHeight(24)).toEqual({});
  });
});
