// Leitura de USFM (formato de texto bíblico do ebible.org e de várias editoras) para o texto limpo do leitor:
// um livro com capítulos e versículos, sem notas de rodapé, referências cruzadas, títulos nem marcas de estilo.
import { getBook } from './books.ts';

export interface BookText {
  /** código USFM do livro, ex.: 'JHN' */
  book: string;
  /** chapters[c - 1][v - 1] = texto do versículo (vazio se o arquivo pulou o número) */
  chapters: string[][];
}

/** Marcas de parágrafo cujo conteúdo não é texto de versículo (títulos, cabeçalhos, introdução). */
const SKIP_LINE = /^\\(id|ide|h|toc\d?|mt\d?|ms\d?|mr|s\d?|sr|r|d|sp|rem|is\d?|ip|imt\d?|cl|cp|cd|sts|usfm)\b/;

/** Tira notas (\f…\f*, \x…\x*, \fe…\fe*), atributos de palavra e marcas de estilo, mantendo o texto. */
function cleanInline(text: string): string {
  return text
    .replace(/\\(f|fe|x)\s[\s\S]*?\\\1\*/g, ' ')
    .replace(/\|[^\\]*?(?=\\\+?\w+\*)/g, '') // \w palavra|strong="G25"\w* → \w palavra\w*
    .replace(/\\\+?[a-z]+\d*\*?/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .trim();
}

export function parseUsfm(source: string): BookText | null {
  const id = source.match(/^\s*\\id\s+([1-3A-Z]{3})/m);
  if (!id || !getBook(id[1]!)) return null;

  const chapters: string[][] = [];
  let current: string[] | null = null;
  let verse = 0;

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || SKIP_LINE.test(line)) continue;
    const c = line.match(/^\\c\s+(\d+)/);
    if (c) {
      const n = Number(c[1]);
      while (chapters.length < n) chapters.push([]);
      current = chapters[n - 1]!;
      verse = 0;
      continue;
    }
    if (!current) continue;
    // Uma linha pode trazer vários \v; o texto antes do primeiro continua o versículo anterior (poesia \q).
    const parts = line.split(/\\v\s+(\d+)\S*\s*/);
    const head = cleanInline(parts[0]!);
    if (head && verse > 0) current[verse - 1] = `${current[verse - 1] ?? ''} ${head}`.trim();
    for (let i = 1; i < parts.length; i += 2) {
      verse = Number(parts[i]);
      while (current.length < verse - 1) current.push('');
      current[verse - 1] = cleanInline(parts[i + 1] ?? '');
    }
  }
  return { book: id[1]!, chapters };
}
