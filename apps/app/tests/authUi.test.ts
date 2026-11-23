import { AuthError } from '@glife/domain/auth';
import { describe, expect, it } from 'vitest';

import { formatTotpSecret, nextOtpValue, splitOtp } from '../src/features/auth/components/otp';
import { authMessage, errorCodeOf } from '../src/features/auth/hooks/messages';

describe('campo de código de 6 casas', () => {
  it('aceita só dígitos e no máximo 6', () => {
    expect(nextOtpValue('', '48a2-1 9', false)).toBe('482193'.slice(0, 5));
    expect(nextOtpValue('', '4821930', false)).toBe('482193');
  });

  it('aceita o código colado inteiro, com espaço no meio', () => {
    expect(nextOtpValue('', '482 193', false)).toBe('482193');
  });

  it('depois de um erro, o próximo dígito recomeça o código', () => {
    expect(nextOtpValue('482193', '4821937', true)).toBe('7');
  });

  it('depois de um erro, apagar limpa tudo', () => {
    expect(nextOtpValue('482193', '48219', true)).toBe('');
  });

  it('depois de um erro, colar um código novo o substitui', () => {
    expect(nextOtpValue('482193', '305718', true)).toBe('305718');
  });

  it('divide em dois grupos de 3 casas, com a casa em foco', () => {
    expect(splitOtp('4821')).toEqual({ digits: ['4', '8', '2', '1', '', ''], focus: 4 });
    expect(splitOtp('482193')).toEqual({ digits: ['4', '8', '2', '1', '9', '3'], focus: -1 });
  });
});

describe('chave manual do autenticador', () => {
  it('agrupa de 4 em 4, em duas linhas', () => {
    expect(formatTotpSecret('JBSWY3DPEHPK3PXPKZ4MQTRG6NDA2HWE')).toEqual(['JBSW Y3DP EHPK 3PXP', 'KZ4M QTRG 6NDA 2HWE']);
  });

  it('ignora espaços e caixa baixa vindos do servidor', () => {
    expect(formatTotpSecret('jbsw y3dp ehpk')).toEqual(['JBSW Y3DP', 'EHPK']);
  });
});

describe('mensagens de acesso', () => {
  it('extrai o código do erro de autenticação (desconhecido para o resto)', () => {
    expect(errorCodeOf(new AuthError('network'))).toBe('network');
    expect(errorCodeOf(new Error('x'))).toBe('unknown');
  });

  it('dá tom de erro só ao que é culpa da digitação', () => {
    expect(authMessage('invalid_credentials', 'signin').tone).toBe('danger');
    expect(authMessage('network', 'signin').tone).toBe('secondary');
    expect(authMessage('rate_limited', 'signin').tone).toBe('warning');
  });

  it('explica o código inválido conforme a etapa', () => {
    expect(authMessage('invalid_code', 'enroll').text).toMatch(/30 segundos/);
    expect(authMessage('invalid_code', 'verify').text).toMatch(/data e a hora/);
  });
});
