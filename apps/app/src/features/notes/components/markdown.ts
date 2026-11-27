// Markdown mínimo do modo Ler: títulos (# título, ## subtítulo), parágrafos, listas, citações; **negrito**, *itálico*,
// ++sublinhado++, ~~tachado~~, ==marca-texto==, [[vínculos]] e links http(s). Os estilos de trecho não se aninham.
// Tudo vira dados (nunca HTML): a tela decide como desenhar, sem risco de injeção.

/** Estilos de trecho e a marcação que os envolve (a barra de formatação usa a mesma tabela). */
export const INLINE_MARKS = { bold: '**', italic: '*', underline: '++', strike: '~~', highlight: '==' } as const;
export type InlineStyle = keyof typeof INLINE_MARKS;
const STYLE_GROUPS: InlineStyle[] = ['bold', 'italic', 'underline', 'strike', 'highlight'];

export type Inline =
  | { type: 'text'; text: string }
  | { type: InlineStyle; text: string }
  | { type: 'wikilink'; target: string; text: string }
  | { type: 'link'; url: string; text: string };

export type Block =
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'quote'; inline: Inline[]; cite: string | null };

// Grupos 1–5: negrito, itálico, sublinhado, tachado, marca-texto (** antes de *); 6–7 vínculo; 8–9 link.
const INLINE_RE =
  /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\+\+([^+\n]+)\+\+|~~([^~\n]+)~~|==([^=\n]+)==|\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (t: string) => {
    if (!t) return;
    const prev = out.at(-1);
    if (prev?.type === 'text') prev.text += t;
    else out.push({ type: 'text', text: t });
  };
  for (const m of text.matchAll(INLINE_RE)) {
    push(text.slice(last, m.index));
    const styled = STYLE_GROUPS.findIndex((_, i) => m[i + 1] !== undefined);
    if (styled !== -1) out.push({ type: STYLE_GROUPS[styled]!, text: m[styled + 1]! });
    else if (m[6] !== undefined) out.push({ type: 'wikilink', target: m[6].trim(), text: (m[7] ?? m[6]).trim() });
    else out.push({ type: 'link', text: m[8]!, url: m[9]! });
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return out;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
/** "texto — Romanos 8:39" → cita separada no fim da citação. */
const CITE = /^(.*\S)\s+[—–]\s+([^—–]+)$/;

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const text = quote.join(' ').trim();
    const m = text.match(CITE);
    blocks.push({ type: 'quote', inline: parseInline(m ? m[1]! : text), cite: m ? m[2]!.trim() : null });
    quote = [];
  };
  const addItem = (ordered: boolean, text: string) => {
    const prev = blocks.at(-1);
    if (prev?.type === 'list' && prev.ordered === ordered) prev.items.push(parseInline(text));
    else blocks.push({ type: 'list', ordered, items: [parseInline(text)] });
  };

  for (const line of md.split(/\r?\n/)) {
    if (!line.trim()) {
      flushParagraph();
      flushQuote();
      continue;
    }
    const q = line.match(QUOTE);
    if (q) {
      flushParagraph();
      quote.push(q[1]!);
      continue;
    }
    flushQuote();
    const h = line.match(HEADING);
    const b = line.match(BULLET);
    const n = line.match(NUMBERED);
    if (h) {
      flushParagraph();
      blocks.push({ type: 'heading', level: h[1]!.length, inline: parseInline(h[2]!.trim()) });
    } else if (b || n) {
      flushParagraph();
      addItem(!b, (b ?? n)![1]!);
    } else {
      // Linha comum logo após uma lista começa um parágrafo novo.
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushQuote();
  return blocks;
}
