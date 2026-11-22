// Livros da Bíblia: código USFM (usado nas refs OSIS-like `JHN.3.16`), nome em pt-BR,
// abreviação de exibição, aliases aceitos na digitação e número de capítulos.

export interface BibleBook {
  code: string;
  name: string;
  abbr: string;
  aliases: string[];
  chapters: number;
  testament: 'AT' | 'NT';
}

type Row = [code: string, name: string, abbr: string, aliases: string, chapters: number];

const AT: Row[] = [
  ['GEN', 'Gênesis', 'Gn', 'gn gen genesis', 50],
  ['EXO', 'Êxodo', 'Êx', 'ex exo exodo', 40],
  ['LEV', 'Levítico', 'Lv', 'lv lev levitico', 27],
  ['NUM', 'Números', 'Nm', 'nm num numeros', 36],
  ['DEU', 'Deuteronômio', 'Dt', 'dt deu deut deuteronomio', 34],
  ['JOS', 'Josué', 'Js', 'js jos josue', 24],
  ['JDG', 'Juízes', 'Jz', 'jz jui juizes', 21],
  ['RUT', 'Rute', 'Rt', 'rt rute', 4],
  ['1SA', '1 Samuel', '1Sm', '1sm 1sa 1sam 1samuel', 31],
  ['2SA', '2 Samuel', '2Sm', '2sm 2sa 2sam 2samuel', 24],
  ['1KI', '1 Reis', '1Rs', '1rs 1re 1reis', 22],
  ['2KI', '2 Reis', '2Rs', '2rs 2re 2reis', 25],
  ['1CH', '1 Crônicas', '1Cr', '1cr 1cro 1cronicas', 29],
  ['2CH', '2 Crônicas', '2Cr', '2cr 2cro 2cronicas', 36],
  ['EZR', 'Esdras', 'Ed', 'ed esd esdras', 10],
  ['NEH', 'Neemias', 'Ne', 'ne nee neemias', 13],
  ['EST', 'Ester', 'Et', 'et est ester', 10],
  // "Jó" é tratado à parte (acento distingue de "Jo" = João).
  ['JOB', 'Jó', 'Jó', 'job', 42],
  ['PSA', 'Salmos', 'Sl', 'sl sal salmo salmos', 150],
  ['PRO', 'Provérbios', 'Pv', 'pv pro prov proverbios', 31],
  ['ECC', 'Eclesiastes', 'Ec', 'ec ecl eclesiastes', 12],
  ['SNG', 'Cânticos', 'Ct', 'ct cant cantares canticos canticodoscanticos', 8],
  ['ISA', 'Isaías', 'Is', 'is isa isaias', 66],
  ['JER', 'Jeremias', 'Jr', 'jr jer jeremias', 52],
  ['LAM', 'Lamentações', 'Lm', 'lm lam lamentacoes', 5],
  ['EZK', 'Ezequiel', 'Ez', 'ez eze ezequiel', 48],
  ['DAN', 'Daniel', 'Dn', 'dn dan daniel', 12],
  ['HOS', 'Oseias', 'Os', 'os ose oseias', 14],
  ['JOL', 'Joel', 'Jl', 'jl joel', 3],
  ['AMO', 'Amós', 'Am', 'am amos', 9],
  ['OBA', 'Obadias', 'Ob', 'ob obd obadias', 1],
  ['JON', 'Jonas', 'Jn', 'jn jon jonas', 4],
  ['MIC', 'Miqueias', 'Mq', 'mq miq miqueias', 7],
  ['NAM', 'Naum', 'Na', 'na naum', 3],
  ['HAB', 'Habacuque', 'Hc', 'hc hab habacuque', 3],
  ['ZEP', 'Sofonias', 'Sf', 'sf sof sofonias', 3],
  ['HAG', 'Ageu', 'Ag', 'ag ageu', 2],
  ['ZEC', 'Zacarias', 'Zc', 'zc zac zacarias', 14],
  ['MAL', 'Malaquias', 'Ml', 'ml mal malaquias', 4],
];

const NT: Row[] = [
  ['MAT', 'Mateus', 'Mt', 'mt mat mateus', 28],
  ['MRK', 'Marcos', 'Mc', 'mc mar marcos', 16],
  ['LUK', 'Lucas', 'Lc', 'lc luc lucas', 24],
  ['JHN', 'João', 'Jo', 'jo joa joao', 21],
  ['ACT', 'Atos', 'At', 'at atos', 28],
  ['ROM', 'Romanos', 'Rm', 'rm rom romanos', 16],
  ['1CO', '1 Coríntios', '1Co', '1co 1cor 1corintios', 16],
  ['2CO', '2 Coríntios', '2Co', '2co 2cor 2corintios', 13],
  ['GAL', 'Gálatas', 'Gl', 'gl gal galatas', 6],
  ['EPH', 'Efésios', 'Ef', 'ef efe efesios', 6],
  ['PHP', 'Filipenses', 'Fp', 'fp fil filipenses', 4],
  ['COL', 'Colossenses', 'Cl', 'cl col colossenses', 4],
  ['1TH', '1 Tessalonicenses', '1Ts', '1ts 1tes 1tessalonicenses', 5],
  ['2TH', '2 Tessalonicenses', '2Ts', '2ts 2tes 2tessalonicenses', 3],
  ['1TI', '1 Timóteo', '1Tm', '1tm 1tim 1timoteo', 6],
  ['2TI', '2 Timóteo', '2Tm', '2tm 2tim 2timoteo', 4],
  ['TIT', 'Tito', 'Tt', 'tt tit tito', 3],
  ['PHM', 'Filemom', 'Fm', 'fm flm filemom filemon', 1],
  ['HEB', 'Hebreus', 'Hb', 'hb heb hebreus', 13],
  ['JAS', 'Tiago', 'Tg', 'tg tia tiago', 5],
  ['1PE', '1 Pedro', '1Pe', '1pe 1pd 1ped 1pedro', 5],
  ['2PE', '2 Pedro', '2Pe', '2pe 2pd 2ped 2pedro', 3],
  ['1JN', '1 João', '1Jo', '1jo 1joa 1joao', 5],
  ['2JN', '2 João', '2Jo', '2jo 2joa 2joao', 1],
  ['3JN', '3 João', '3Jo', '3jo 3joa 3joao', 1],
  ['JUD', 'Judas', 'Jd', 'jd jud judas', 1],
  ['REV', 'Apocalipse', 'Ap', 'ap apo apoc apocalipse', 22],
];

const toBook =
  (testament: 'AT' | 'NT') =>
  ([code, name, abbr, aliases, chapters]: Row): BibleBook => ({
    code,
    name,
    abbr,
    aliases: aliases.split(' '),
    chapters,
    testament,
  });

export const BIBLE_BOOKS: readonly BibleBook[] = [...AT.map(toBook('AT')), ...NT.map(toBook('NT'))];

const byCode = new Map(BIBLE_BOOKS.map((b) => [b.code, b]));
const byAlias = new Map<string, BibleBook>();
for (const b of BIBLE_BOOKS) for (const a of b.aliases) byAlias.set(a, b);

export function getBook(code: string): BibleBook | undefined {
  return byCode.get(code.toUpperCase());
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Converte o nome digitado ("1 Co", "II Coríntios", "Jó", "salmos") no livro. */
export function findBook(input: string): BibleBook | undefined {
  const raw = input.trim().toLowerCase().replace(/[ºª.]/g, '');
  if (raw === 'jó') return byCode.get('JOB');

  // Numeral romano no início ("II Coríntios") só quando seguido de espaço.
  const roman = raw.match(/^(iii|ii|i)\s+(.+)$/);
  const withDigit = roman ? `${roman[1]!.length}${roman[2]}` : raw;

  const key = stripAccents(withDigit).replace(/\s+/g, '');
  return byAlias.get(key);
}
