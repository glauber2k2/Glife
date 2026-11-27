// Converte uma pasta de arquivos USFM (um livro por arquivo) no texto embutido do app:
// apps/app/assets/bible/<id>/<LIVRO>.bible (JSON) + apps/app/src/features/bible/data/bundled/<id>.ts.
// Uso (na raiz glife/): node tools/bible-import/import.mjs <pastaUsfm> <id> "<SIGLA>" "<Nome>" "<crédito>"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { BIBLE_BOOKS } from '../../packages/domain/src/bible/books.ts';
import { parseUsfm } from '../../packages/domain/src/bible/usfm.ts';

const [dir, id, abbr, name, credit] = process.argv.slice(2);
if (!dir || !/^[a-z0-9]{2,12}$/.test(id ?? '') || !abbr || !name || !credit) {
  console.error('uso: import.mjs <pastaUsfm> <id> <SIGLA> <Nome> <crédito>');
  process.exit(1);
}
const root = resolve(import.meta.dirname, '../..');
const outDir = join(root, 'apps/app/assets/bible', id);
mkdirSync(outDir, { recursive: true });

const books = new Map();
for (const f of readdirSync(dir).filter((f) => /\.(usfm|sfm)$/i.test(f))) {
  const parsed = parseUsfm(readFileSync(join(dir, f), 'utf8'));
  if (parsed) books.set(parsed.book, parsed);
}

const problems = [];
let verses = 0;
for (const b of BIBLE_BOOKS) {
  const got = books.get(b.code);
  if (!got) { problems.push(`${b.code}: ausente`); continue; }
  if (got.chapters.length !== b.chapters) problems.push(`${b.code}: ${got.chapters.length} capítulos (books.ts: ${b.chapters})`);
  got.chapters.forEach((c, i) => { if (c.length === 0) problems.push(`${b.code} ${i + 1}: capítulo vazio`); });
  verses += got.chapters.reduce((n, c) => n + c.length, 0);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const lines = [];
for (const b of BIBLE_BOOKS) {
  writeFileSync(join(outDir, `${b.code}.bible`), JSON.stringify(books.get(b.code)));
  lines.push(`    '${b.code}': require('../../../../../assets/bible/${id}/${b.code}.bible'),`);
}
const q = (s) => JSON.stringify(s);
const ts = `// Gerado por tools/bible-import/import.mjs — não editar à mão.
/* eslint-disable @typescript-eslint/no-require-imports -- assets do Metro só entram por require */
import type { BundledTranslation } from '../bundledText';

export const ${id.toUpperCase()}: BundledTranslation = {
  id: ${q(id)},
  abbr: ${q(abbr)},
  name: ${q(name)},
  credit: ${q(credit)},
  books: {
${lines.join('\n')}
  },
};
`;
const tsDir = join(root, 'apps/app/src/features/bible/data/bundled');
mkdirSync(tsDir, { recursive: true });
writeFileSync(join(tsDir, `${id}.ts`), ts);
const jhn = books.get('JHN').chapters[2][15];
console.log(`${id}: ${books.size} livros, ${verses} versículos. Jo 3:16 = ${jhn.slice(0, 60)}…`);
console.log(`Gn 1:1 = ${books.get('GEN').chapters[0][0].slice(0, 50)}… | Sl 23:1 = ${books.get('PSA').chapters[22][0].slice(0, 50)}…`);

