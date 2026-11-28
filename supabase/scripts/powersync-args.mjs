// Regras do `pnpm ps`: usa o sync-streams.yaml do projeto e trava o que muda produção.
// - validate/deploy recebem o arquivo do projeto (a CLI esperaria powersync/sync-config.yaml).
// - deploy só publica com --yes; sem ele roda como prévia (--dry-run).
// - stop e compact só com --yes; destroy nunca (só pelo painel, por decisão do dono).

export const SYNC_FILE = 'supabase/powersync/sync-streams.yaml';
/** Pasta de projeto que a CLI exige (a instância vem de INSTANCE_ID no .env.powersync.local). */
export const PS_DIR = 'supabase/powersync';

const USES_SYNC_FILE = new Set(['validate', 'deploy']);
const NEEDS_YES = new Set(['stop', 'compact']);
const USES_DIR = new Set(['validate', 'deploy', 'status', 'compact', 'stop', 'generate']);
const usesDir = (args) => USES_DIR.has(args[0]) || (args[0] === 'fetch' && (args[1] === 'config' || args[1] === 'status'));

/** @returns {{ run: boolean, args: string[], notice?: string }} */
export function planPowersync(input) {
  const yes = input.includes('--yes');
  let args = input.filter((a) => a !== '--yes');
  const command = args[0] ?? '';

  if (command === 'destroy') {
    return { run: false, args, notice: '[ps] "destroy" apaga a instância: faça só pelo painel do PowerSync, se o dono do projeto pedir.' };
  }
  if (NEEDS_YES.has(command) && !yes) {
    return { run: false, args, notice: `[ps] "${command}" mexe na instância de produção: repita com --yes depois de confirmar com o dono do projeto.` };
  }
  if (usesDir(args) && !args.some((a) => a.startsWith('--directory'))) args = [...args, `--directory=${PS_DIR}`];
  if (USES_SYNC_FILE.has(command) && !args.some((a) => a.startsWith('--sync-config-file-path'))) {
    args = [...args, `--sync-config-file-path=${SYNC_FILE}`];
  }
  if (command === 'deploy' && !yes && !args.includes('--dry-run')) {
    return {
      run: true,
      args: [...args, '--dry-run'],
      notice: '[ps] Prévia (--dry-run): nada foi publicado. Para publicar em produção, repita com --yes depois de confirmar com o dono do projeto.',
    };
  }
  return { run: true, args };
}
