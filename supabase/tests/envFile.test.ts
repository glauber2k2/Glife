import { describe, expect, it } from 'vitest';

import { cliEnv, parseEnvFile } from '../scripts/env-file.mjs';

describe('parseEnvFile', () => {
  it('lê chave=valor ignorando comentários e linhas vazias', () => {
    const text = '# comentário\n\nSUPABASE_ACCESS_TOKEN=sbp_abc\r\nSUPABASE_DB_PASSWORD=@x*2026!=fim\n';
    expect(parseEnvFile(text)).toEqual({ SUPABASE_ACCESS_TOKEN: 'sbp_abc', SUPABASE_DB_PASSWORD: '@x*2026!=fim' });
  });

  it('remove aspas e espaços ao redor', () => {
    expect(parseEnvFile(`A = "com espaço" \nB='simples'\nC=  nua  `)).toEqual({ A: 'com espaço', B: 'simples', C: 'nua' });
  });

  it('descarta valores vazios e linhas malformadas', () => {
    expect(parseEnvFile('VAZIA=\nsem_igual\n=sem_chave\n1INVALIDA=x\nOK=1')).toEqual({ OK: '1' });
  });
});

describe('cliEnv', () => {
  it('só repassa as variáveis da CLI do Supabase', () => {
    const env = cliEnv({ SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 'p', OUTRA: 'x', SUPABASE_SERVICE_ROLE_KEY: 's' });
    expect(env).toEqual({ SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 'p' });
  });
});
