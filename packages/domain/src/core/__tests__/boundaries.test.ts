// Regra 5: domain/ não importa React, React Native, Expo nem Supabase.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..');
const FORBIDDEN = /from\s+['"](react|react-native|expo[^'"]*|@supabase\/[^'"]+|@powersync\/[^'"]+)['"]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('fronteiras do domain', () => {
  it('nenhum arquivo importa React, Expo ou Supabase', () => {
    const offenders = walk(SRC).filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
