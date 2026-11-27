// Autenticação comum das Edge Functions: exige JWT válido de sessão com MFA (aal2), a mesma regra do banco
// (política restritiva "exige mfa") e do sync. `verify` é injetado: em produção, `supabase.auth.getClaims`.

export type VerifyJwt = (jwt: string) => Promise<Record<string, unknown> | null>;

export type AuthResult = { userId: string } | { status: 401 | 403; error: string };

export async function requireAal2(req: Request, verify: VerifyJwt): Promise<AuthResult> {
  const header = req.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return { status: 401, error: 'Sessão necessária.' };
  let claims: Record<string, unknown> | null = null;
  try {
    claims = await verify(match[1]!);
  } catch {
    claims = null;
  }
  const sub = claims?.sub;
  if (typeof sub !== 'string' || !sub) return { status: 401, error: 'Sessão inválida.' };
  if (claims?.aal !== 'aal2') return { status: 403, error: 'Confirme o segundo fator para continuar.' };
  return { userId: sub };
}
