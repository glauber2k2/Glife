// Leitura do arquivo local de credenciais da CLI do Supabase (fora do git).

/** Variáveis que a CLI entende e que este projeto aceita repassar. */
export const CLI_VARS = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'];

/** Interpreta um arquivo KEY=VALUE simples. Valores vazios e linhas malformadas são descartados. */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted = value.match(/^(["'])(.*)\1$/);
    if (quoted) value = quoted[2];
    if (value) out[key] = value;
  }
  return out;
}

/** Filtra só o que a CLI precisa: nada além disso vaza para o processo filho. */
export function cliEnv(vars) {
  return Object.fromEntries(CLI_VARS.filter((k) => vars[k]).map((k) => [k, vars[k]]));
}

/** Variáveis da CLI do PowerSync: o token (segredo) e os ids da instância (fora do git: o repositório é público). */
export const POWERSYNC_VARS = ['PS_ADMIN_TOKEN', 'INSTANCE_ID', 'PROJECT_ID', 'ORG_ID'];

export function powersyncEnv(vars) {
  return Object.fromEntries(POWERSYNC_VARS.filter((k) => vars[k]).map((k) => [k, vars[k]]));
}
