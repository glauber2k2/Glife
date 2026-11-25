import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { financeTables } from '../src/features/finance/data/schema';
import { linksTables } from '../src/features/links/data/schema';
import { notesTables } from '../src/features/notes/data/schema';

const migrationsDir = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations');

/** Itens de primeiro nível de um `create table (...)`: separa nas vírgulas fora de parênteses (checks de várias linhas). */
function topLevelItems(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body.replace(/--[^\n]*/g, '')) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
    } else current += ch;
  }
  items.push(current.trim());
  return items.filter(Boolean);
}

/** Colunas de cada `create table public.x (...)` das migrações (sem `id`, que o PowerSync cria sozinho). */
function migrationColumns(): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const m of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
      const columns = topLevelItems(m[2]!)
        .filter((item) => /^[a-z_][a-z0-9_]* [a-z]/.test(item) && !/^(foreign|primary|unique|check|constraint) /.test(item))
        .map((item) => item.split(/\s/)[0]!)
        .filter((name) => name !== 'id');
      tables.set(m[1]!, columns);
    }
    for (const m of sql.matchAll(/alter table public\.(\w+)\s+add column (\w+)/g)) tables.get(m[1]!)?.push(m[2]!);
  }
  return tables;
}

const local = { ...notesTables, ...linksTables, ...financeTables };
const remote = migrationColumns();

describe('schema local (PowerSync) espelha as migrações', () => {
  it('cobre as tabelas sincronizadas', () => {
    expect(Object.keys(local).sort()).toEqual([
      'accounts',
      'budgets',
      'categories',
      'entity_tags',
      'investment_assets',
      'investment_movements',
      'links',
      'note_folders',
      'notes',
      'recurrences',
      'shopping_items',
      'shopping_lists',
      'tags',
      'transactions',
    ]);
  });

  it.each(Object.keys(local))('%s tem as mesmas colunas do banco', (name) => {
    const columns = local[name as keyof typeof local].columns.map((c) => c.name).sort();
    expect(remote.get(name), `tabela ${name} não encontrada nas migrações`).toBeDefined();
    expect(columns).toEqual([...remote.get(name)!].sort());
  });

  it('booleano vira inteiro e o resto é texto', () => {
    const pinned = notesTables.notes.columns.find((c) => c.name === 'pinned');
    expect(pinned?.type).toBe('INTEGER');
  });
});
