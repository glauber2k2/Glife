#!/usr/bin/env node
// Hook Stop: se houver alterações não commitadas, bloqueia a parada e pede ao Claude
// que atualize o HANDOFF.md, rode os testes e faça commit. Assim o plano fica sempre
// atualizado, mesmo que a sessão acabe a qualquer momento.
// - stop_hook_active = true na entrada → sai sem fazer nada (evita loop).
// - Sem alterações pendentes → não faz nada.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let input = {};
  try {
    input = JSON.parse((await readStdin()) || '{}');
  } catch {
    input = {};
  }
  if (input.stop_hook_active === true) return;

  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean);
  if (status.length === 0) return;

  const arquivos = status.slice(0, 15).map((l) => `  ${l}`).join('\n');
  const mais = status.length > 15 ? `\n  … e mais ${status.length - 15}` : '';

  const reason = [
    `Há ${status.length} alteração(ões) não commitada(s) em glife/:`,
    arquivos + mais,
    '',
    'Antes de parar:',
    '1. Atualize o HANDOFF.md: "Estado atual" com o estado exato. Se uma tarefa ficou pela metade,',
    '   diga o que foi feito e o que falta, para o Codex (ou a próxima sessão) continuar dali.',
    '2. Rode pnpm lint, pnpm typecheck e pnpm test na raiz glife/.',
    '3. Faça commit "claude: <descrição>" (se algo falhar, commite mesmo assim e registre a falha no HANDOFF.md).',
  ].join('\n');

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

main().catch(() => {
  // Falha do hook nunca deve prender a sessão.
});
