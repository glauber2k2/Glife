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
    .filter((m) => m.ruleId === 'boundaries/dependencies' || m.ruleId === 'no-restricted-syntax')
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
