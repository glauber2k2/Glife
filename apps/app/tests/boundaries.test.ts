/// <reference types="node" />
/**
 * Garante que o ESLint barra os imports proibidos pelas regras de arquitetura do CLAUDE.md.
 * Roda o ESLint de verdade sobre trechos de código em caminhos virtuais dentro de src/.
 */
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const appDir = join(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: appDir });

async function violations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(appDir, filePath) });
  return result.messages
    .filter((m) => ['boundaries/dependencies', 'no-restricted-syntax', 'no-restricted-imports'].includes(m.ruleId ?? ''))
    .map((m) => m.ruleId as string);
}

describe('fronteiras entre features', () => {
  it('regra 3: uma feature não importa outra feature', async () => {
    const v = await violations('src/features/notes/x.ts', `export { FinanceHomeScreen } from '@/features/finance';`);
    expect(v).toContain('boundaries/dependencies');
  });

  it('regra 3: today pode compor outras features pela porta da frente', async () => {
    const v = await violations('src/features/today/x.ts', `export { FinanceHomeScreen } from '@/features/finance';`);
    expect(v).toEqual([]);
  });

  it('regra 2: nem today importa arquivo interno de outra feature', async () => {
    const v = await violations(
      'src/features/today/x.ts',
      `export { FinanceHomeScreen } from '@/features/finance/screens/FinanceHomeScreen';`,
    );
    expect(v).toContain('boundaries/dependencies');
  });

  it('regra 1: uma feature importa livremente os próprios arquivos', async () => {
    const v = await violations('src/features/notes/x.ts', `export { NoteListScreen } from './screens/NoteListScreen';`);
    expect(v).toEqual([]);
  });

  it('regra 4: shared não importa features', async () => {
    const v = await violations('src/shared/lib/x.ts', `export { NoteListScreen } from '@/features/notes';`);
    expect(v).toContain('boundaries/dependencies');
  });

  it('rotas apontam para a porta da frente de uma feature', async () => {
    const v = await violations('src/app/x.tsx', `export { NoteListScreen as default } from '@/features/notes';`);
    expect(v).toEqual([]);
  });

  it('cor hex solta fora dos tokens é proibida', async () => {
    const v = await violations('src/features/notes/x.ts', `export const c = '#FF0000';`);
    expect(v).toContain('no-restricted-syntax');
  });
});

describe.each(['@powersync/react-native', '@supabase/supabase-js'])('acesso a %s só na camada de dados', (sdk) => {
  it.each([
    'src/features/notes/screens/x.ts',
    'src/app/x.ts',
    'src/shared/ui/x.ts',
  ])('barra o SDK em %s', async (filePath) => {
    expect(await violations(filePath, `import * as sdk from '${sdk}'; void sdk;`))
      .toContain('no-restricted-imports');
  });

  it.each(['src/features/notes/data/x.ts', 'src/shared/lib/x.ts'])('permite o SDK em %s', async (filePath) => {
    expect(await violations(filePath, `import * as sdk from '${sdk}'; void sdk;`)).toEqual([]);
  });

  it('barra também reexportações e imports de tipo em telas', async () => {
    const code = `import type { Client } from '${sdk}'; export type { Client }; export * from '${sdk}';`;
    expect(await violations('src/features/notes/screens/x.ts', code)).toContain('no-restricted-imports');
  });
});
