import { describe, expect, it } from 'vitest';

import { fonts, palettes, planHues, reading, typeScale } from '../src/shared/ui/theme/tokens';

describe('tokens da leitura bíblica (Bíblia v2)', () => {
  it('nenhuma variante de texto usa Literata: Outfit em tudo', () => {
    for (const [name, style] of Object.entries(typeScale)) expect(style.font, name).not.toMatch(/^Literata/);
    expect(typeScale.scripture.font).toBe(fonts.sans.regular);
    expect(typeScale.chapterNumber.font).toBe(fonts.sans.extraLight);
  });

  it('sobretom da seleção, papel e tinta nos dois temas', () => {
    expect(palettes.light.selectionTone).toBe('rgba(45,91,255,0.12)');
    expect(palettes.dark.selectionTone).toBe('rgba(143,167,255,0.20)');
    expect(palettes.light.paper).toBe('#FFFFFF');
    expect(palettes.dark.paper).toBe('#0F1219');
    expect(palettes.light.ink).toBe('#171B22');
    expect(palettes.dark.ink).toBe('#E6E9F0');
  });

  it('faixas e limites dos ajustes de leitura', () => {
    expect(reading.highlightGapEm).toBe(0.42);
    expect(reading.highlightGapMin).toBe(4);
    expect(reading.fontSize).toEqual({ min: 15, max: 26, step: 1, default: 19 });
    expect(reading.lineHeight).toEqual({ min: 1.6, max: 2.4, step: 0.05, default: 1.9 });
    expect(reading.letterSpacing).toEqual({ min: -2, max: 10, step: 1, default: 0 });
    expect(planHues).toEqual([350, 25, 130, 205, 260, 305]);
  });
});
