import { describe, expect, it } from 'vitest';

import { moduleColors, oklchToHex } from '../src/shared/ui/theme/moduleColors';
import { fonts, layout, palettes, pressScale, radius, size, space, typeScale } from '../src/shared/ui/theme/tokens';

// Valores do design system Glife Cobalto v1.0, em docs/design-system-cobalto/tokens.css.
describe('tokens do design system', () => {
  it('usa o fundo cinza, cartões brancos e o cobalto', () => {
    expect(palettes.light).toMatchObject({ bg: '#F1F3F6', card: '#FFFFFF', hairline: '#ECEEF2', text: '#0E1116', accent: '#2D5BFF', tonal: '#E2E8FF' });
    expect(palettes.dark).toMatchObject({ bg: '#0C0F15', card: '#161B24', hairline: '#232A37', text: '#EEF1F6', accent: '#3F68FF', accentInk: '#8FA7FF' });
  });

  it('desenha os dois modos com as mesmas chaves', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
    expect(Object.keys(palettes.dark.shadow).sort()).toEqual(Object.keys(palettes.light.shadow).sort());
  });

  it('reserva quatro marca-textos para leitura', () => {
    expect(Object.keys(palettes.light.highlight)).toEqual(['yellow', 'green', 'blue', 'pink']);
  });

  it('usa Outfit na interface e Literata só na leitura bíblica', () => {
    expect(typeScale.title.font).toBe(fonts.sans.semibold);
    expect(typeScale.body.font).toBe(fonts.sans.regular);
    expect(typeScale.scripture.font).toBe(fonts.serif.regular);
    expect(fonts.sans.regular).toMatch(/^Outfit_/);
    expect(fonts.serif.regular).toMatch(/^Literata_/);
    expect(fonts.mono.regular).toMatch(/^DMMono_/);
  });

  it('segue a escala tipográfica Cobalto', () => {
    expect(typeScale.display).toMatchObject({ fontSize: 44, lineHeight: 46, letterSpacing: -2 });
    expect(typeScale.title).toMatchObject({ fontSize: 32, lineHeight: 36 });
    expect(typeScale.heading.fontSize).toBe(20);
    expect(typeScale.body).toMatchObject({ fontSize: 16, lineHeight: 24 });
    expect(typeScale.label).toMatchObject({ fontSize: 12, font: fonts.sans.semibold, textTransform: 'uppercase' });
  });

  it('usa os raios do Cobalto', () => {
    expect(radius).toMatchObject({ full: 999, checkbox: 7, field: 16, card: 24, dialog: 26, sheet: 28 });
  });

  it('usa margem de 20 px e 24 px entre blocos', () => {
    expect(layout.gutter).toBe(20);
    expect(layout.blockGap).toBe(24);
    expect(space[5]).toBe(20);
  });

  it('tem as alturas de controle do sistema', () => {
    expect(size).toMatchObject({ button: 52, buttonMedium: 44, buttonSmall: 36, iconButton: 42, field: 52, tabBar: 68 });
  });

  it('afunda 0,96 no toque', () => {
    expect(pressScale).toMatchObject({ rest: 1, pressed: 0.96 });
  });

  it('converte oklch e gera as cores de módulo', () => {
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
    expect(moduleColors(80, 'light')).toEqual({ soft: '#fbedd5', strong: '#804f00', chart: '#ac7d1b' });
    expect(moduleColors(160, 'dark').strong).toBe('#92e2b7');
  });
});
