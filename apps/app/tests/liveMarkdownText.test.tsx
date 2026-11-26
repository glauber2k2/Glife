import { createElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Exercise the actual component's text boundary without loading the Android runtime.
vi.mock('react-native', () => ({ Text: ({ children, style }: { children?: ReactNode; style?: unknown }) => {
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

import { LiveMarkdown } from '../src/features/notes/components/LiveMarkdownText';

describe('native live Markdown text tree', () => {
  it('keeps one text root when switching between styled, plain and empty content', () => {
    // Call through a wrapper to preserve hooks while inspecting the component result.
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
});
