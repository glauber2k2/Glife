import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const streams = readFileSync(join(root, 'powersync', 'sync-streams.yaml'), 'utf8');

/** Tabelas que as migrações colocam na publicação do PowerSync. */
function publishedTables(): string[] {
  const dir = join(root, 'migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .flatMap((f) => [...readFileSync(join(dir, f), 'utf8').matchAll(/alter publication powersync add table ([^;]+);/gi)])
    .flatMap((m) => m[1]!.split(',').map((t) => t.trim().replace(/^public\./, '')));
}

const queries = [...streams.matchAll(/^\s*-\s*(SELECT .+)$/gim)].map((m) => m[1]!);

// O PowerSync lê com powersync_role (BYPASSRLS): sem estes filtros, um usuário receberia dados de outro,
// ou uma sessão só com senha (sem MFA) receberia dados que o banco recusaria.
describe('sync streams do PowerSync', () => {
  const tables = publishedTables();

  it('encontra as tabelas publicadas', () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables)('sincroniza %s', (table) => {
    expect(queries.some((q) => new RegExp(`\\bFROM ${table}\\b`, 'i').test(q))).toBe(true);
  });

  it('toda consulta filtra pelo dono e exige sessão com MFA (aal2)', () => {
    expect(queries.length).toBe(tables.length);
    for (const q of queries) {
      expect(q).toMatch(/WHERE user_id = auth\.user_id\(\) AND auth\.parameter\('aal'\) = 'aal2'$/);
    }
  });
});
