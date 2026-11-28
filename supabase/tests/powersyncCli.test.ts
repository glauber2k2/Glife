import { describe, expect, it } from 'vitest';

import { powersyncEnv } from '../scripts/env-file.mjs';
import { PS_DIR, SYNC_FILE, planPowersync } from '../scripts/powersync-args.mjs';

describe('powersyncEnv', () => {
  it('só repassa token e ids do PowerSync', () => {
    const env = powersyncEnv({ PS_ADMIN_TOKEN: 't', INSTANCE_ID: 'i', PROJECT_ID: 'p', ORG_ID: 'o', SUPABASE_ACCESS_TOKEN: 's', OUTRA: 'x' });
    expect(env).toEqual({ PS_ADMIN_TOKEN: 't', INSTANCE_ID: 'i', PROJECT_ID: 'p', ORG_ID: 'o' });
  });
});

describe('planPowersync', () => {
  it('validate e deploy usam o sync-streams.yaml do projeto', () => {
    expect(planPowersync(['validate'])).toEqual({ run: true, args: ['validate', `--directory=${PS_DIR}`, `--sync-config-file-path=${SYNC_FILE}`] });
    expect(planPowersync(['deploy', 'sync-config', '--yes'])).toEqual({
      run: true,
      args: ['deploy', 'sync-config', `--directory=${PS_DIR}`, `--sync-config-file-path=${SYNC_FILE}`],
    });
  });

  it('não troca o arquivo quando ele vem no comando', () => {
    expect(planPowersync(['validate', '--directory=x', '--sync-config-file-path=outro.yaml']).args).toEqual(['validate', '--directory=x', '--sync-config-file-path=outro.yaml']);
  });

  it('deploy sem --yes vira prévia (--dry-run) e avisa', () => {
    const p = planPowersync(['deploy', 'sync-config']);
    expect(p.run).toBe(true);
    expect(p.args).toEqual(['deploy', 'sync-config', `--directory=${PS_DIR}`, `--sync-config-file-path=${SYNC_FILE}`, '--dry-run']);
    expect(p.notice).toMatch(/--yes/);
  });

  it('--dry-run explícito não precisa de --yes', () => {
    expect(planPowersync(['deploy', 'sync-config', '--dry-run']).notice).toBeUndefined();
  });

  it('stop e compact só com --yes; destroy nunca', () => {
    expect(planPowersync(['stop']).run).toBe(false);
    expect(planPowersync(['compact', '--yes'])).toEqual({ run: true, args: ['compact', `--directory=${PS_DIR}`] });
    const d = planPowersync(['destroy', '--yes']);
    expect(d.run).toBe(false);
    expect(d.notice).toMatch(/painel/);
  });

  it('comandos de leitura passam direto', () => {
    expect(planPowersync(['fetch', 'config'])).toEqual({ run: true, args: ['fetch', 'config', `--directory=${PS_DIR}`] });
    expect(planPowersync(['status'])).toEqual({ run: true, args: ['status', `--directory=${PS_DIR}`] });
    expect(planPowersync(['fetch', 'instances'])).toEqual({ run: true, args: ['fetch', 'instances'] });
    expect(planPowersync(['login'])).toEqual({ run: true, args: ['login'] });
  });
});
