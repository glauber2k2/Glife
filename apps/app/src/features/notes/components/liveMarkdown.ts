// Markdown ao vivo no campo de escrever: o texto é cortado em trechos com estilo, e as marcações (`#`, `**`, `==`,
// `[[`…) continuam no texto, só que apagadas. Juntar os trechos devolve exatamente o texto original (o campo edita o
// markdown cru; nada é escondido nem convertido). Puro e testável; a tela decide como cada estilo fica.

export type LiveStyle =
  | 'mark'
  | 'h1'
  | 'h2'
  | 'quote'
  | 'bullet'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'link';

export interface LiveSpan {
  text: string;
  styles: LiveStyle[];
}

const STYLED: { re: RegExp; style: LiveStyle; open: number }[] = [
  { re: /^\*\*([^*\n]+)\*\*/, style: 'bold', open: 2 },
  { re: /^\*([^*\n]+)\*/, style: 'italic', open: 1 },
  { re: /^\+\+([^+\n]+)\+\+/, style: 'underline', open: 2 },
  { re: /^~~([^~\n]+)~~/, style: 'strike', open: 2 },
  { re: /^==([^=\n]+)==/, style: 'highlight', open: 2 },
];
const WIKILINK = /^\[\[([^[\]\n]+)\]\]/;
const LINK = /^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/;
const HEADING = /^(#{1,6})(\s+)/;
const QUOTE = /^(\s*>\s?)/;
const BULLET = /^(\s*(?:[-*+]|\d+[.)])\s+)/;

/** Trechos de uma linha (sem a quebra), com o estilo da linha somado ao de cada trecho. */
function lineSpans(line: string): LiveSpan[] {
  const out: LiveSpan[] = [];
  const add = (text: string, styles: LiveStyle[]) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.styles.join() === styles.join()) prev.text += text;
    else out.push({ text, styles });
  };

  let rest = line;
  let base: LiveStyle[] = [];
  const h = rest.match(HEADING);
  const q = !h && rest.match(QUOTE);
  const b = !h && !q && rest.match(BULLET);
  if (h) {
    base = [h[1]!.length === 1 ? 'h1' : 'h2'];
    add(h[0], [...base, 'mark']);
    rest = rest.slice(h[0].length);
  } else if (q) {
    base = ['quote'];
    add(q[0], [...base, 'mark']);
    rest = rest.slice(q[0].length);
  } else if (b) {
    add(b[0], ['bullet']);
    rest = rest.slice(b[0].length);
  }

  let plain = '';
  const flush = () => {
    add(plain, base);
    plain = '';
  };
  while (rest) {
    const styled = rest.startsWith('*') || rest.startsWith('+') || rest.startsWith('~') || rest.startsWith('=')
      ? STYLED.map((s) => ({ s, m: rest.match(s.re) })).find((x) => x.m)
      : undefined;
    const wiki = !styled && rest.startsWith('[[') ? rest.match(WIKILINK) : null;
    const link = !styled && !wiki && rest.startsWith('[') ? rest.match(LINK) : null;
    if (styled?.m) {
      flush();
      const { s, m } = styled;
      const mark = m[0].slice(0, s.open);
      add(mark, [...base, s.style, 'mark']);
      add(m[1]!, [...base, s.style]);
      add(mark, [...base, s.style, 'mark']);
      rest = rest.slice(m[0].length);
    } else if (wiki) {
      flush();
      add('[[', [...base, 'link', 'mark']);
      add(wiki[1]!, [...base, 'link']);
      add(']]', [...base, 'link', 'mark']);
      rest = rest.slice(wiki[0].length);
    } else if (link) {
      flush();
      add('[', [...base, 'link', 'mark']);
      add(link[1]!, [...base, 'link']);
      add(`](${link[2]})`, [...base, 'link', 'mark']);
      rest = rest.slice(link[0].length);
    } else {
      plain += rest[0];
      rest = rest.slice(1);
    }
  }
  flush();
  return out;
}

/** O texto todo em trechos; as quebras de linha ficam em trechos sem estilo. */
export function liveSpans(markdown: string): LiveSpan[] {
  const out: LiveSpan[] = [];
  markdown.split('\n').forEach((line, i) => {
    if (i > 0) out.push({ text: '\n', styles: [] });
    out.push(...lineSpans(line));
  });
  return out;
}
