import { describe, expect, it } from 'vitest';

import { fonts, layout, palettes, pressScale, radius, size, space, typeScale } from '../src/shared/ui/theme/tokens';

// Valores do design system Glife (direção Glaciar + Sinóptico), em docs/design-system/tokens.
describe('tokens do design system', () => {
  it('usa os neutros azulados e o azul-aço da direção Glaciar', () => {
    expect(palettes.light).toMatchObject({ bg: '#F1F4F7', soft: '#E3EAF1', hairline: '#D9E1E9', text: '#14273B', accent: '#3A6690', accentInk: '#345D84' });
    expect(palettes.dark).toMatchObject({ bg: '#0F1822', soft: '#192633', hairline: '#233242', text: '#E8EFF5', accent: '#7FA9D1', accentInk: '#8DB5DB' });
  });

  it('desenha os dois modos com as mesmas chaves', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('reserva quatro marca-textos para leitura', () => {
    expect(Object.keys(palettes.light.highlight)).toEqual(['ice', 'honey', 'mint', 'lilac']);
  });

  it('usa Hanken Grotesk na interface e Crimson Pro só na leitura', () => {
    expect(typeScale.title.font).toBe(fonts.sans.light);
    expect(typeScale.body.font).toBe(fonts.sans.regular);
    expect(typeScale.reading.font).toBe(fonts.serif.regular);
    expect(typeScale.scripture.font).toBe(fonts.serif.regular);
    expect(fonts.sans.light).toMatch(/^HankenGrotesk_/);
    expect(fonts.serif.regular).toMatch(/^CrimsonPro_/);
  });

  it('segue a escala tipográfica Sinóptico', () => {
    expect(typeScale.display.fontSize).toBe(44);
    expect(typeScale.title.fontSize).toBe(34);
    expect(typeScale.body.fontSize).toBe(15);
    expect(typeScale.label).toMatchObject({ fontSize: 11, font: fonts.sans.semibold, textTransform: 'uppercase' });
  });

  it('usa pílulas nos controles e cantos largos em campos, cards e folhas', () => {
    expect(radius).toMatchObject({ full: 999, field: 16, card: 20, sheet: 30 });
  });

  it('usa margem lateral de 22 px e respiro de 18 px entre blocos', () => {
    expect(layout.gutter).toBe(22);
    expect(layout.blockGap).toBe(18);
    expect(space[5]).toBe(20);
  });

  it('tem as alturas de controle do sistema', () => {
    expect(size).toMatchObject({ button: 48, buttonSmall: 40, field: 54, chipHeight: 34, tabBar: 70 });
  });

  it('afunda 0,96 no toque (0,9 em controles pequenos)', () => {
    expect(pressScale).toMatchObject({ rest: 1, pressed: 0.96, pressedSmall: 0.9 });
  });
});
