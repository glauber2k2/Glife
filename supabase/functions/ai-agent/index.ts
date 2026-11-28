// Composição da Edge Function `ai-agent`. Secrets: DEEPSEEK_API_KEY, GLIFE_AI_USD_BRL (cotação do dólar para o teto
// em reais) e GLIFE_AI_MODEL (opcional). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY vêm do ambiente.
import { parseUsdBrl } from '@glife/domain/ai';
import { createClient } from '@supabase/supabase-js';

import { supabaseAiBudget } from './budget.ts';
import { createHandler } from './handler.ts';
import { buildLanguageModel } from './model.ts';

const env = (name: string) => Deno.env.get(name)?.trim() || null;

const admin = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const verify = async (jwt: string) => {
  const { data, error } = await admin.auth.getClaims(jwt);
  return error || !data ? null : (data.claims as unknown as Record<string, unknown>);
};

Deno.serve(
  createHandler({
    verify,
    budget: supabaseAiBudget(admin),
    model: buildLanguageModel(),
    usdBrl: parseUsdBrl(env('GLIFE_AI_USD_BRL')),
  }),
);
