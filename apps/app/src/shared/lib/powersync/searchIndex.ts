// Índices de busca (FTS5) sobre as tabelas internas do PowerSync. Cada tabela sincronizada é uma view sobre
// `ps_data__<tabela>(id, data JSON)`; gatilhos nessa tabela mantêm o índice em dia tanto para o que o app grava
// quanto para o que chega pela sincronização. O rowid do índice é o rowid da linha em ps_data__<tabela>:
// a consulta junta por rowid, então uma entrada órfã (REPLACE do sync) nunca aparece.
import type { LocalDb, LocalQueries } from '@glife/domain/core';

export interface FtsIndexSpec {
  /** prefixo da tabela FTS (ex.: `search_notes`) */
  name: string;
  /** suba quando mudar colunas ou tokenizador: a versão antiga é apagada e a nova, preenchida */
  version: number;
  /** tabela do schema local (sem o prefixo ps_data__) */
  table: string;
  /** coluna do índice → coluna da tabela, na ordem do índice */
  columns: Record<string, string>;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;

function ident(s: string): string {
  if (!IDENT.test(s)) throw new Error(`Identificador inválido no índice de busca: ${s}`);
  return s;
}

export const ftsTableName = (spec: FtsIndexSpec) => `${ident(spec.name)}_v${Math.trunc(spec.version)}`;

const triggerNames = (fts: string) => [`${fts}_ai`, `${fts}_au`, `${fts}_ad`];

/** Tudo no banco que pertence a esse índice (qualquer versão): tabelas FTS, sombras e gatilhos. */
async function objectsOf(db: LocalQueries, spec: FtsIndexSpec) {
  return db.getAll<{ name: string; type: string }>(
    "SELECT name, type FROM sqlite_master WHERE name LIKE ? ESCAPE '\\'",
    [`${ident(spec.name).replace(/_/g, '\\_')}\\_v%`],
  );
}

async function dropAll(db: LocalQueries, spec: FtsIndexSpec) {
  const objects = await objectsOf(db, spec);
  for (const o of objects.filter((x) => x.type === 'trigger')) await db.execute(`DROP TRIGGER IF EXISTS "${o.name}"`);
  // Só as tabelas virtuais: as sombras (_data, _idx…) vão junto.
  const virtual = new Set(
    (
      await db.getAll<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'",
      )
    ).map((r) => r.name),
  );
  for (const o of objects.filter((x) => virtual.has(x.name))) await db.execute(`DROP TABLE IF EXISTS "${o.name}"`);
}

async function create(db: LocalQueries, spec: FtsIndexSpec) {
  const fts = ftsTableName(spec);
  const data = `ps_data__${ident(spec.table)}`;
  const cols = Object.keys(spec.columns).map(ident);
  const extract = (row: 'NEW' | 'OLD' | 'p') =>
    Object.values(spec.columns)
      .map((c) => `json_extract(${row}.data, '$.${ident(c)}')`)
      .join(', ');
  const into = `${fts} (rowid, ${cols.join(', ')})`;
  await db.execute(
    `CREATE VIRTUAL TABLE ${fts} USING fts5(${cols.join(', ')}, tokenize = 'unicode61 remove_diacritics 2')`,
  );
  const [ai, au, ad] = triggerNames(fts);
  await db.execute(`CREATE TRIGGER ${ai} AFTER INSERT ON ${data} BEGIN
    DELETE FROM ${fts} WHERE rowid = NEW.rowid;
    INSERT INTO ${into} VALUES (NEW.rowid, ${extract('NEW')});
  END`);
  await db.execute(`CREATE TRIGGER ${au} AFTER UPDATE ON ${data} BEGIN
    DELETE FROM ${fts} WHERE rowid = OLD.rowid;
    INSERT INTO ${into} VALUES (NEW.rowid, ${extract('NEW')});
  END`);
  await db.execute(`CREATE TRIGGER ${ad} AFTER DELETE ON ${data} BEGIN
    DELETE FROM ${fts} WHERE rowid = OLD.rowid;
  END`);
  await db.execute(`INSERT INTO ${into} SELECT p.rowid, ${extract('p')} FROM ${data} p`);
}

/**
 * Garante cada índice: completo → só limpa órfãos; faltando algo (ou versão nova) → apaga e recria preenchido.
 * Sem FTS5 no SQLite do aparelho devolve `available: false` (a busca cai para a varredura).
 */
export async function ensureSearchIndexes(db: LocalDb, specs: FtsIndexSpec[]): Promise<{ available: boolean }> {
  try {
    for (const spec of specs) {
      const fts = ftsTableName(spec);
      await db.writeTransaction(async (tx) => {
        const names = new Set((await objectsOf(tx, spec)).map((o) => o.name));
        const complete = [fts, ...triggerNames(fts)].every((n) => names.has(n));
        if (complete) {
          await tx.execute(`DELETE FROM ${fts} WHERE rowid NOT IN (SELECT rowid FROM ps_data__${ident(spec.table)})`);
          return;
        }
        await dropAll(tx, spec);
        await create(tx, spec);
      });
    }
    return { available: true };
  } catch (e) {
    console.warn('Índice de busca indisponível; a busca usa a varredura.', e);
    return { available: false };
  }
}

/** Ao sair: nenhum texto pessoal fica no índice. */
export async function dropSearchIndexes(db: LocalDb, specs: FtsIndexSpec[]): Promise<void> {
  for (const spec of specs) await db.writeTransaction((tx) => dropAll(tx, spec));
}
