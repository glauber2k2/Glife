import { AuthError, type AuthErrorCode } from '@glife/domain/auth';

const BY_CODE: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  mfa_verification_failed: 'invalid_code',
  mfa_challenge_expired: 'invalid_code',
  mfa_verification_rejected: 'invalid_code',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
};

/** Converte qualquer erro do Supabase/rede num AuthError neutro (o original fica em `cause`). */
export function toAuthError(raw: unknown): AuthError {
  if (raw instanceof AuthError) return raw;
  const e = (typeof raw === 'object' && raw !== null ? raw : {}) as { code?: unknown; status?: unknown; name?: unknown };
  const mapped = typeof e.code === 'string' ? BY_CODE[e.code] : undefined;
  let code: AuthErrorCode = mapped ?? 'unknown';
  if (!mapped) {
    if (e.status === 429) code = 'rate_limited';
    else if (e.name === 'AuthRetryableFetchError' || raw instanceof TypeError) code = 'network';
  }
  return new AuthError(code, { cause: raw });
}
