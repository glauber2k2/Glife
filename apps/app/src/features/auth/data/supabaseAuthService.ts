import {
  AuthError,
  normalizeEmail,
  normalizeTotpCode,
  resolveAuthStage,
  type AuthService,
  type AuthState,
} from '@glife/domain/auth';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { toAuthError } from './errors';
import { svgFromDataUrl } from './qr';

/** Fatores TOTP verificados, lidos da própria sessão (sem rede). */
function verifiedTotp(session: Session | null) {
  return (session?.user.factors ?? []).filter((f) => f.factor_type === 'totp' && f.status === 'verified');
}

/** Implementação do AuthService sobre o Supabase Auth. */
export function createSupabaseAuthService(supabase: SupabaseClient): AuthService {
  const auth = supabase.auth;

  async function stateOf(session: Session | null): Promise<AuthState> {
    if (!session) return { stage: 'signed_out', email: null };
    // Lê o nível da sessão a partir do JWT guardado: funciona offline.
    const { data } = await auth.mfa.getAuthenticatorAssuranceLevel();
    const stage = resolveAuthStage({
      signedIn: true,
      currentLevel: data?.currentLevel === 'aal2' ? 'aal2' : data?.currentLevel === 'aal1' ? 'aal1' : null,
      verifiedTotpFactors: verifiedTotp(session).length,
    });
    return { stage, email: session.user.email ?? null };
  }

  /** Executa uma chamada do Supabase e converte qualquer falha em AuthError. */
  async function run<R extends { error: unknown }>(op: () => Promise<R>): Promise<R> {
    let result: R;
    try {
      result = await op();
    } catch (e) {
      throw toAuthError(e);
    }
    if (result.error) throw toAuthError(result.error);
    return result;
  }

  function required<T>(data: T | null | undefined): T {
    if (data == null) throw new AuthError('unknown');
    return data;
  }

  async function currentSession() {
    const { data } = await auth.getSession();
    return data.session;
  }

  return {
    async getState() {
      return stateOf(await currentSession());
    },

    watch(listener) {
      let active = true;
      const emit = (session: Session | null) => {
        void stateOf(session).then((s) => active && listener(s));
      };
      // O Supabase já emite INITIAL_SESSION ao se inscrever.
      const { data } = auth.onAuthStateChange((_event, session) => {
        // Não chamar o Supabase de dentro do callback (trava o lock interno): adia.
        setTimeout(() => emit(session), 0);
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    },

    async signIn(email, password) {
      const normalized = normalizeEmail(email);
      if (!normalized || !password) throw new AuthError('invalid_credentials');
      await run(() => auth.signInWithPassword({ email: normalized, password }));
    },

    async signOut() {
      // 'local': encerra só este aparelho, também sem rede.
      await run(() => auth.signOut({ scope: 'local' }));
    },

    async startTotpEnrollment() {
      const factors = required((await run(() => auth.mfa.listFactors())).data);
      for (const f of factors.all) {
        if (f.factor_type === 'totp' && f.status !== 'verified') {
          await run(() => auth.mfa.unenroll({ factorId: f.id }));
        }
      }
      const enrolled = required(
        (await run(() => auth.mfa.enroll({ factorType: 'totp', friendlyName: `Glife ${Date.now()}` }))).data,
      );
      const qrSvg = svgFromDataUrl(enrolled.totp.qr_code);
      if (!qrSvg) throw new AuthError('unknown');
      return { factorId: enrolled.id, qrSvg, secret: enrolled.totp.secret };
    },

    async confirmTotpEnrollment(factorId, code) {
      const normalized = normalizeTotpCode(code);
      if (!normalized) throw new AuthError('invalid_code');
      await run(() => auth.mfa.challengeAndVerify({ factorId, code: normalized }));
    },

    async verifyTotp(code) {
      const normalized = normalizeTotpCode(code);
      if (!normalized) throw new AuthError('invalid_code');
      const factor = verifiedTotp(await currentSession())[0];
      if (!factor) throw new AuthError('unknown');
      await run(() => auth.mfa.challengeAndVerify({ factorId: factor.id, code: normalized }));
    },
  };
}
