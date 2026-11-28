// Teto e uso da IA pelas funções do banco (só service_role chama: o app não grava uso). Antes de chamar o modelo,
// reserva uma estimativa de forma atômica (pedidos em paralelo não furam o teto); no fim, acerta com o custo real.
import type { AiUsage } from '@glife/domain/ai';

export interface AiBudget {
  /** Reserva `cents` se o gasto do mês ainda não chegou ao teto; null = teto alcançado. */
  reserve(userId: string, cents: number): Promise<string | null>;
  /** Troca a estimativa reservada pelo custo real. */
  settle(reservationId: string, userId: string, usage: AiUsage, microUsd: number, cents: number): Promise<void>;
}

export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}

export function supabaseAiBudget(admin: RpcClient): AiBudget {
  return {
    async reserve(userId, cents) {
      const { data, error } = await admin.rpc('ai_reserve_budget', { p_user: userId, p_cents: cents });
      if (error) throw new Error(`ai_reserve_budget ${error.code ?? ''}`);
      return typeof data === 'string' ? data : null;
    },
    async settle(reservationId, userId, usage, microUsd, cents) {
      const { error } = await admin.rpc('ai_settle_usage', {
        p_id: reservationId,
        p_user: userId,
        p_micro_usd: microUsd,
        p_cents: cents,
        p_hit: usage.cacheHitTokens,
        p_miss: usage.cacheMissTokens,
        p_out: usage.outputTokens,
      });
      if (error) throw new Error(`ai_settle_usage ${error.code ?? ''}`);
    },
  };
}
