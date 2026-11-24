#!/usr/bin/env node
// Hook SessionStart ("modo reserva"): lê o "Último commit" do STATUS.md e, se houver commits depois dele
// (feitos pelo Codex ou por outra sessão), imprime a lista e a instrução de revisão (o stdout entra no
// contexto do Claude). Sem commits novos ou sem STATUS.md, não imprime nada. Nunca falha a abertura da sessão.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

function lastRecordedCommit() {
  const status = readFileSync(resolve(root, 'STATUS.md'), 'utf8');
  const match = status.match(/^-\s*Último commit:\s*`?([0-9a-f]{7,40})`?/im);
  return match ? match[1] : null;
}

function main() {
  const base = lastRecordedCommit();
  if (!base) return;
  git('rev-parse', '--verify', `${base}^{commit}`); // hash desconhecido → lança e o hook fica em silêncio
  const commits = git('log', '--oneline', `${base}..HEAD`).split('\n').filter(Boolean);
  if (commits.length === 0) return;

  process.stdout.write(
    [
      `=== Retomada: ${commits.length} commit(s) depois do "Último commit" do STATUS.md (${base}) ===`,
      ...commits.map((c) => `  - ${c}`),
      '',
      'Se algum não for desta sessão (Codex ou outra sessão), antes de seguir:',
      `1. Revise só o diff: git diff ${base}..HEAD (não leia os arquivos inteiros).`,
      '2. Rode pnpm lint, pnpm typecheck e pnpm test na raiz glife/ e corrija o que falhar.',
      '3. Dê ao usuário um resumo de 3 a 5 linhas do que mudou.',
      '',
    ].join('\n'),
  );
}

try {
  main();
} catch {
  // Sem git, sem STATUS.md ou hash inválido: não atrapalha a sessão.
}
