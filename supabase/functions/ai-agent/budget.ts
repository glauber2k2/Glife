// Teto e uso da IA pelas funções do banco (só service_role chama: o app não grava uso).
import type { AiUsage } from '@glife/domain/ai';

export interface AiBudget {
  status(userId: string): Promise<{ capCents: number; spentCents: number }>;
  record(userId: string, usage: AiUsage, microUsd: number, cents: number): Promise<void>;
}

export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}

export function supabaseAiBudget(admin: RpcClient): AiBudget {
  return {
    async status(userId) {
      const { data, error } = await admin.rpc('ai_budget_status', { p_user: userId });
      if (error) throw new Error(`ai_budget_status ${error.code ?? ''}`);
      const row = (Array.isArray(data) ? data[0] : data) as { cap_cents: number; spent_cents: number } | undefined;
      return { capCents: row?.cap_cents ?? 0, spentCents: row?.spent_cents ?? 0 };
    },
    async record(userId, usage, microUsd, cents) {
      const { error } = await admin.rpc('ai_record_usage', {
        p_user: userId,
        p_micro_usd: microUsd,
        p_cents: cents,
        p_hit: usage.cacheHitTokens,
        p_miss: usage.cacheMissTokens,
        p_out: usage.outputTokens,
      });
      if (error) throw new Error(`ai_record_usage ${error.code ?? ''}`);
    },
  };
}
