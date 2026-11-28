// `pnpm ps <comando>`: roda a CLI do PowerSync (pacote `powersync`, fixo no package.json) com as credenciais
// DESTE projeto, lidas de `.env.powersync.local` na raiz (ignorado pelo git). Regras em powersync-args.mjs:
// usa supabase/powersync/sync-streams.yaml; deploy sem --yes é só prévia; destroy bloqueado.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseEnvFile, powersyncEnv } from './env-file.mjs';
import { planPowersync } from './powersync-args.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = join(root, '.env.powersync.local');

const vars = existsSync(file) ? powersyncEnv(parseEnvFile(readFileSync(file, 'utf8'))) : {};
if (!vars.PS_ADMIN_TOKEN) console.warn('[ps] Faltando PS_ADMIN_TOKEN em .env.powersync.local (veja .env.powersync.example).');
if (!vars.INSTANCE_ID) console.warn('[ps] Faltando INSTANCE_ID em .env.powersync.local (veja .env.powersync.example).');

const plan = planPowersync(process.argv.slice(2));
if (plan.notice && !plan.run) {
  console.error(plan.notice);
  process.exit(1);
}

// No Windows o git entrega o YAML com CRLF; o publicado é LF. Manda uma cópia em LF para a prévia mostrar só
// mudanças reais (e o publicado não trocar de quebra de linha).
const FILE_FLAG = '--sync-config-file-path=';
const CRLF = /\r\n/g;
const args = plan.args.map((a) => {
  if (!a.startsWith(FILE_FLAG)) return a;
  const source = join(root, a.slice(FILE_FLAG.length));
  const copy = join(mkdtempSync(join(tmpdir(), 'glife-ps-')), 'sync-streams.yaml');
  writeFileSync(copy, readFileSync(source, 'utf8').replace(CRLF, '\n'));
  return FILE_FLAG + copy;
});

// Chama a CLI instalada no projeto direto pelo Node (sem shell: os argumentos não passam por aspas do Windows).
// (node_modules na raiz: o pnpm do projeto usa node-linker=hoisted)
const pkgDir = join(root, 'node_modules', 'powersync');
const bin = join(pkgDir, JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).bin.powersync);

const child = spawn(process.execPath, [bin, ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, ...vars } });
child.on('exit', (code) => {
  if (plan.notice) console.warn(plan.notice);
  process.exit(code ?? 1);
});
