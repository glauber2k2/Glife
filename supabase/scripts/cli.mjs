// `pnpm sb <comando>`: roda a CLI do Supabase com as credenciais DESTE projeto,
// lidas de `.env.supabase.local` na raiz (ignorado pelo git), sem depender do `supabase login` global.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLI_VARS, cliEnv, parseEnvFile } from './env-file.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = join(root, '.env.supabase.local');

const vars = existsSync(file) ? cliEnv(parseEnvFile(readFileSync(file, 'utf8'))) : {};
const missing = CLI_VARS.filter((k) => !vars[k]);
if (missing.length) {
  console.warn(`[sb] Faltando em .env.supabase.local: ${missing.join(', ')} (veja .env.supabase.example).`);
}

const args = process.argv.slice(2);
const isWindows = process.platform === 'win32';
// No Windows o npx é um .cmd e precisa de shell: os argumentos vão entre aspas.
const quote = (a) => (isWindows ? `"${a.replace(/"/g, '\\"')}"` : a);

const child = spawn('npx', ['--yes', 'supabase', ...args].map(quote), {
  cwd: root,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, ...vars },
});
child.on('exit', (code) => process.exit(code ?? 1));
