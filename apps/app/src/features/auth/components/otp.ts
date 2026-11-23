export const OTP_LENGTH = 6;

const digitsOnly = (raw: string) => raw.replace(/\D/g, '');

/**
 * Próximo valor do campo de código a partir do texto digitado/colado.
 * Depois de um erro, digitar recomeça do zero com o que entrou de novo, e apagar limpa tudo.
 */
export function nextOtpValue(previous: string, raw: string, invalid: boolean): string {
  const digits = digitsOnly(raw);
  if (invalid) {
    if (digits.length < previous.length) return '';
    if (digits.startsWith(previous)) return digits.slice(previous.length, previous.length + OTP_LENGTH);
  }
  return digits.slice(0, OTP_LENGTH);
}

/** Casas preenchidas e a casa em foco (-1 quando completo). */
export function splitOtp(value: string): { digits: string[]; focus: number } {
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');
  return { digits, focus: value.length >= OTP_LENGTH ? -1 : value.length };
}

/** Chave TOTP em grupos de 4, dividida em duas linhas, para digitar sem se perder. */
export function formatTotpSecret(secret: string): string[] {
  const groups = secret.replace(/\s/g, '').toUpperCase().match(/.{1,4}/g) ?? [];
  const half = Math.ceil(groups.length / 2);
  return [groups.slice(0, half), groups.slice(half)].filter((line) => line.length > 0).map((line) => line.join(' '));
}
