import { describe, expect, it } from 'vitest';

import {
  formatClock,
  lockPhase,
  timeoutLabel,
  triesText,
  waitNextText,
} from '../src/features/app-lock/hooks/lockText';

const base = {
  configured: true,
  biometrics: false,
  timeoutMs: 60_000,
  failures: 0,
  blockedUntil: null,
  requireAccount: false,
  mustUsePassword: false,
};

describe('textos do bloqueio (protótipo Glife Bloqueio, seção Regras)', () => {
  it('contagem discreta conforme a próxima consequência', () => {
    expect(triesText(3)).toBe('3 de 5 tentativas antes de esperar');
    expect(triesText(6)).toBe('6 de 7 tentativas antes de esperar');
    expect(triesText(8)).toBe('8 de 10 tentativas antes de travar');
  });

  it('aviso da espera diz o que vem depois', () => {
    expect(waitNextText(5)).toBe('Mais 2 erros e a próxima espera é de 5 min.');
    expect(waitNextText(7)).toBe('Mais 3 erros e o app trava até você entrar com a conta.');
  });

  it('relógio m:ss arredonda para cima (nunca mostra 0:00 antes de liberar)', () => {
    expect(formatClock(24_000)).toBe('0:24');
    expect(formatClock(23_001)).toBe('0:24');
    expect(formatClock(277_000)).toBe('4:37');
    expect(formatClock(-5)).toBe('0:00');
  });

  it('rótulos de "Bloquear depois de"', () => {
    expect([0, 60_000, 300_000, 900_000].map(timeoutLabel)).toEqual([
      'Imediatamente',
      '1 minuto',
      '5 minutos',
      '15 minutos',
    ]);
  });
});

describe('lockPhase', () => {
  const now = 1_000_000;
  it('travado vence tudo', () => {
    expect(lockPhase({ ...base, requireAccount: true, mustUsePassword: true }, now, true)).toBe('travado');
  });
  it('espera enquanto o prazo não passou; depois volta ao campo', () => {
    expect(lockPhase({ ...base, failures: 5, blockedUntil: now + 1 }, now, true)).toBe('espera');
    expect(lockPhase({ ...base, failures: 5, blockedUntil: now }, now, false)).toBe('senha');
  });
  it('digital nova pede a senha com o aviso próprio', () => {
    expect(lockPhase({ ...base, mustUsePassword: true }, now, false)).toBe('nova');
  });
  it('erro só logo depois de uma tentativa errada', () => {
    expect(lockPhase({ ...base, failures: 2 }, now, true)).toBe('erro');
    expect(lockPhase({ ...base, failures: 2 }, now, false)).toBe('senha');
  });
});
