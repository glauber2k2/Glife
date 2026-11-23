// `pnpm sb <comando>`: roda a CLI do Supabase com as credenciais DESTE projeto,
// lidas de `.env.supabase.local` na raiz (ignorado pelo git), sem depender do `supabase login` global.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEnv, parseEnvFile } from './env-file.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = join(root, '.env.supabase.local');

const vars = existsSync(file) ? cliEnv(parseEnvFile(readFileSync(file, 'utf8'))) : {};
// Só o token é obrigatório: sem senha, a CLI cria um acesso temporário ao banco pelo próprio token.
if (!vars.SUPABASE_ACCESS_TOKEN) {
  console.warn('[sb] Faltando SUPABASE_ACCESS_TOKEN em .env.supabase.local (veja .env.supabase.example).');
}

const args = process.argv.slice(2);
const isWindows = process.platform === 'win32';
// No Windows o npx é um .cmd e precisa de shell: monta uma linha só, com cada argumento entre aspas.
const quote = (a) => `"${a.replace(/"/g, '\\"')}"`;
const command = isWindows ? ['npx --yes supabase', ...args.map(quote)].join(' ') : 'npx';
const commandArgs = isWindows ? [] : ['--yes', 'supabase', ...args];

const child = spawn(command, commandArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, ...vars },
});
child.on('exit', (code) => process.exit(code ?? 1));
