import { moduleTone, type ColorScheme } from './tokens';

/** oklch → sRGB hexadecimal (o React Native não entende oklch). Puro e testável. */
export function oklchToHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
  const hex = rgb
    .map((x) => {
      const v = Math.min(1, Math.max(0, x));
      const g = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(g * 255).toString(16).padStart(2, '0');
    })
    .join('');
  return `#${hex}`;
}

export interface ModuleColors {
  /** fundo do bloco de ícone e de blocos suaves */
  soft: string;
  /** ícone */
  strong: string;
  /** barras e linhas de gráfico */
  chart: string;
}

const cache = new Map<string, ModuleColors>();

/** Cores de um matiz de módulo ou categoria no tema pedido. */
export function moduleColors(hue: number, scheme: ColorScheme): ModuleColors {
  const key = `${scheme}:${hue}`;
  let found = cache.get(key);
  if (!found) {
    const tone = moduleTone[scheme];
    found = {
      soft: oklchToHex(tone.soft.l, tone.soft.c, hue),
      strong: oklchToHex(tone.strong.l, tone.strong.c, hue),
      chart: oklchToHex(tone.chart.l, tone.chart.c, hue),
    };
    cache.set(key, found);
  }
  return found;
}
