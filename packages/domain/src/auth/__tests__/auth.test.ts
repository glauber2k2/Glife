import { describe, expect, it } from 'vitest';

import { AuthError, isAuthError, normalizeEmail, normalizeTotpCode, resolveAuthStage } from '../index.ts';

describe('resolveAuthStage', () => {
  it('sem sessão: entrar', () => {
    expect(resolveAuthStage({ signedIn: false, currentLevel: null, verifiedTotpFactors: 0 })).toBe('signed_out');
  });

  it('sessão aal2: liberado', () => {
    expect(resolveAuthStage({ signedIn: true, currentLevel: 'aal2', verifiedTotpFactors: 1 })).toBe('ready');
  });

  it('aal1 com fator verificado: pedir código', () => {
    expect(resolveAuthStage({ signedIn: true, currentLevel: 'aal1', verifiedTotpFactors: 1 })).toBe('verify_mfa');
  });

  it('aal1 sem fator: configurar autenticador (o banco recusa aal1)', () => {
    expect(resolveAuthStage({ signedIn: true, currentLevel: 'aal1', verifiedTotpFactors: 0 })).toBe('enroll_mfa');
    expect(resolveAuthStage({ signedIn: true, currentLevel: null, verifiedTotpFactors: 0 })).toBe('enroll_mfa');
  });

  it('nunca libera sem aal2, mesmo com dados inconsistentes', () => {
    expect(resolveAuthStage({ signedIn: false, currentLevel: 'aal2', verifiedTotpFactors: 1 })).toBe('signed_out');
  });
});

describe('normalizeTotpCode', () => {
  it.each([
    ['123456', '123456'],
    [' 123 456 ', '123456'],
    ['123-456', '123456'],
  ])('aceita %s', (raw, code) => {
    expect(normalizeTotpCode(raw)).toBe(code);
  });

  it.each(['12345', '1234567', 'abcdef', '', '12345a'])('recusa %s', (raw) => {
    expect(normalizeTotpCode(raw)).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('apara e põe em minúsculas', () => {
    expect(normalizeEmail('  Eu@Exemplo.COM ')).toBe('eu@exemplo.com');
  });

  it.each(['', 'sem-arroba', 'a@', '@b.com', 'a b@c.com'])('recusa %s', (raw) => {
    expect(normalizeEmail(raw)).toBeNull();
  });
});

describe('AuthError', () => {
  it('tem código e mensagem neutra', () => {
    const e = new AuthError('invalid_credentials', { cause: new Error('Invalid login credentials for eu@x.com') });
    expect(isAuthError(e, 'invalid_credentials')).toBe(true);
    expect(isAuthError(e, 'network')).toBe(false);
    expect(e.message).not.toContain('@');
  });
});
