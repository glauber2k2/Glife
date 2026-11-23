// Regras de autenticação: e-mail + senha, depois TOTP obrigatório (o banco só aceita sessão aal2).
// O contrato `AuthService` é implementado em `features/auth/data` (Supabase).
import { z } from 'zod';

import type { Listener, Unsubscribe } from '../core/index.ts';

// ---------- Etapas ----------

export type AuthStage = 'signed_out' | 'enroll_mfa' | 'verify_mfa' | 'ready';
export type AssuranceLevel = 'aal1' | 'aal2';

export interface AuthFacts {
  signedIn: boolean;
  currentLevel: AssuranceLevel | null;
  verifiedTotpFactors: number;
}

/** Qual tela mostrar. Só `ready` libera o app, e só com sessão aal2. */
export function resolveAuthStage(f: AuthFacts): AuthStage {
  if (!f.signedIn) return 'signed_out';
  if (f.currentLevel === 'aal2') return 'ready';
  return f.verifiedTotpFactors > 0 ? 'verify_mfa' : 'enroll_mfa';
}

// ---------- Entradas ----------

const emailSchema = z.email();

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return emailSchema.safeParse(email).success ? email : null;
}

/** Aceita "123 456" ou "123-456"; devolve 6 dígitos ou null. */
export function normalizeTotpCode(raw: string): string | null {
  const code = raw.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

// ---------- Erros ----------

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'invalid_code'
  | 'rate_limited'
  | 'network'
  | 'unknown';

/** Mensagem fixa; detalhes (e-mail, resposta do servidor) só em `cause`. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, options?: { cause?: unknown }) {
    super(`Falha de autenticação (${code}).`, options);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function isAuthError(e: unknown, code?: AuthErrorCode): e is AuthError {
  return e instanceof AuthError && (code === undefined || e.code === code);
}

// ---------- Contrato ----------

export interface AuthState {
  stage: AuthStage;
  /** Só para exibir na interface ("conectado como …"). */
  email: string | null;
}

export interface TotpEnrollment {
  factorId: string;
  /** SVG do QR code (texto). */
  qrSvg: string;
  /** Segredo para digitar manualmente no autenticador. */
  secret: string;
}

export interface AuthService {
  /** Estado atual, lido da sessão guardada (funciona offline). */
  getState(): Promise<AuthState>;
  /** Emite o estado agora e a cada mudança de sessão. */
  watch(listener: Listener<AuthState>): Unsubscribe;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Descarta cadastros de autenticador abandonados e começa um novo. */
  startTotpEnrollment(): Promise<TotpEnrollment>;
  /** Confirma o autenticador com o primeiro código; a sessão vira aal2. */
  confirmTotpEnrollment(factorId: string, code: string): Promise<void>;
  /** Eleva a sessão para aal2 com o código do autenticador já cadastrado. */
  verifyTotp(code: string): Promise<void>;
}
