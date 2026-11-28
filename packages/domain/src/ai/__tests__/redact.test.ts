import { describe, expect, it } from 'vitest';

import { REDACTED, redactPersonalData } from '../index.ts';

describe('redactPersonalData', () => {
  it('remove telefone, e-mail, link e CPF', () => {
    const out = redactPersonalData('ligar 11 98765-4321, joao@x.com, https://a.b/c?t=1, CPF 123.456.789-09');
    expect(out).not.toContain('98765-4321');
    expect(out).not.toContain('joao@x.com');
    expect(out).not.toContain('https://a.b/c?t=1');
    expect(out).not.toContain('123.456.789-09');
    expect(out).toContain(REDACTED);
  });

  it('remove CNPJ e números longos', () => {
    const out = redactPersonalData('CNPJ 12.345.678/0001-90 e cartão 4111111111111111');
    expect(out).not.toContain('12.345.678/0001-90');
    expect(out).not.toContain('4111111111111111');
  });

  it('mantém datas, horários e valores em reais', () => {
    const text = 'Reunião 2026-11-28 às 09:00, gasto de R$ 1.500,00 e R$ 150.000,00 em 28/11/2026';
    expect(redactPersonalData(text)).toBe(text);
  });

  it('mantém os marcadores locais', () => {
    expect(redactPersonalData('[tel1] e [link2] e [email1] e [num3]')).toBe('[tel1] e [link2] e [email1] e [num3]');
  });
});
