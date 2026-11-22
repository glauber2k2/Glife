#!/usr/bin/env node
// Hook SessionStart: se o Codex fez commits ("codex: ...") depois do último commit do Claude
// ("claude: ..."), imprime no stdout a instrução de revisão (o stdout entra no contexto do Claude).
// Sem commits do Codex pendentes, não imprime nada. Nunca falha a abertura da sessão.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

function main() {
  // Mais novo primeiro: "<hash>\t<assunto>"
  const commits = git('log', '--format=%H%x09%s')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split('\t');
      return { hash, subject: rest.join('\t') };
    });

  const isClaude = (c) => /^claude:/i.test(c.subject);
  const isCodex = (c) => /^codex:/i.test(c.subject);

  const lastClaudeIdx = commits.findIndex(isClaude);
  const newer = lastClaudeIdx === -1 ? commits : commits.slice(0, lastClaudeIdx);
  const codexCommits = newer.filter(isCodex);
  if (codexCommits.length === 0) return;

  let base;
  if (lastClaudeIdx !== -1) {
    base = commits[lastClaudeIdx].hash;
  } else {
    // Nenhum commit do Claude ainda: base = pai do commit do Codex mais antigo.
    const oldest = codexCommits[codexCommits.length - 1].hash;
    try {
      base = git('rev-parse', `${oldest}^`);
    } catch {
      base = git('hash-object', '-t', 'tree', '--stdin'); // árvore vazia (commit raiz)
    }
  }
  const short = base.slice(0, 9);
  const lista = codexCommits
    .slice()
    .reverse()
    .map((c) => `  - ${c.hash.slice(0, 9)} ${c.subject}`)
    .join('\n');

  process.stdout.write(
    [
      '=== HANDOFF: o Codex trabalhou desde a sua última sessão ===',
      lastClaudeIdx === -1
        ? `Commits do Codex (ainda não há nenhum commit "claude:"; base ${short}):`
        : `Commits do Codex depois de ${short} (último "claude:"):`,
      lista,
      '',
      'ANTES de qualquer outra coisa (inclusive antes de responder ao pedido do usuário):',
      `1. Revise só o diff: git diff ${short}..HEAD (não leia os arquivos inteiros).`,
      '2. Rode pnpm lint, pnpm typecheck e pnpm test (na raiz glife/).',
      '3. Verifique aderência ao HANDOFF.md (arquivos permitidos, critérios de aceite, "Decisões tomadas"),',
      '   segurança (segredos, RLS, validação de entrada, dados pessoais) e casos de borda.',
      '4. Corrija os problemas encontrados.',
      '5. Responda as "Dúvidas para o Claude" no HANDOFF.md (e ajuste as tarefas se preciso).',
      '6. Faça commit "claude: revisão do codex".',
      '7. Dê ao usuário um resumo de 3 a 5 linhas do que o Codex fez e do que você corrigiu.',
      '',
    ].join('\n'),
  );
}

try {
  main();
} catch {
  // Sem git ou sem commits: não atrapalha a sessão.
}
