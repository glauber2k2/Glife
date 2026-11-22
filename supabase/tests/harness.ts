import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PGlite, type Transaction } from '@electric-sql/pglite';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');

/** Stub mínimo do que o Supabase provê: papéis, auth.users, auth.uid(), auth.jwt() e grants padrão. */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

export const USER_A = '00000000-0000-4000-8000-00000000000a';
export const USER_B = '00000000-0000-4000-8000-00000000000b';

export async function createDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  await db.query('insert into auth.users (id) values ($1), ($2)', [USER_A, USER_B]);
  return db;
}

export type Aal = 'aal1' | 'aal2';

/**
 * Executa `fn` como um usuário autenticado (papel `authenticated` + claims do JWT),
 * do mesmo jeito que o PostgREST/PowerSync fazem. A transação é sempre desfeita.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
  aal: Aal = 'aal2',
): Promise<T> {
  let result!: T;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      const claims = JSON.stringify({ sub: userId, role: 'authenticated', aal });
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
      await tx.exec('set local role authenticated');
      try {
        result = await fn(tx);
      } catch (error) {
        failure = error;
      }
      await tx.rollback();
    })
    .catch(() => undefined);
  if (failure) throw failure;
  return result;
}
