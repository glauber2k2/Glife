import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const config = readFileSync(join(import.meta.dirname, '..', 'config.toml'), 'utf8');

/** Valor de uma chave dentro de uma seção do TOML (só linhas não comentadas). */
function setting(section: string, key: string): string | undefined {
  const start = config.indexOf(`[${section}]\n`) >= 0 ? config.indexOf(`[${section}]\n`) : config.indexOf(`[${section}]\r\n`);
  if (start < 0) return undefined;
  const body = config.slice(start).split(/\r?\n/).slice(1);
  for (const line of body) {
    if (/^\s*\[/.test(line)) break;
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`));
    if (m) return m[1];
  }
  return undefined;
}

describe('segurança da autenticação (config.toml)', () => {
  it('cadastro público desligado', () => {
    expect(setting('auth', 'enable_signup')).toBe('false');
  });

  it('senha com no mínimo 12 caracteres', () => {
    expect(Number(setting('auth', 'minimum_password_length'))).toBeGreaterThanOrEqual(12);
  });

  it('senha exige minúsculas, maiúsculas, dígitos e símbolos', () => {
    expect(setting('auth', 'password_requirements')).toBe('"lower_upper_letters_digits_symbols"');
  });

  it('troca de senha exige reautenticação', () => {
    expect(setting('auth.email', 'secure_password_change')).toBe('true');
  });

  it('MFA por TOTP habilitado', () => {
    expect(setting('auth.mfa.totp', 'enroll_enabled')).toBe('true');
    expect(setting('auth.mfa.totp', 'verify_enabled')).toBe('true');
  });
});
