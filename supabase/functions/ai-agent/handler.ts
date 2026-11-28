// Edge Function `ai-agent`: ponte segura entre o app e o modelo. O servidor NÃO lê o banco do usuário nem executa
// ferramentas: entrega ao modelo só as definições (sem execute) e o app executa com os próprios repositórios.
// Ordem: MFA → configuração → tamanho → formato → teto → limpeza de dados pessoais → modelo → custo real.
// Logs só com código/motivo, nunca conteúdo da conversa.
import {
  AI_TOOLS,
  costMicroUsd,
  microUsdToBrlCents,
  redactPersonalData,
  type AiUsage,
} from '@glife/domain/ai';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type LanguageModel,
  type LanguageModelUsage,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
} from 'ai';

import { requireAal2, type VerifyJwt } from '../_shared/auth.ts';
import type { AiBudget } from './budget.ts';
import { SYSTEM_PROMPT, todayMessage } from './instructions.ts';
import { MODEL_PROVIDER_OPTIONS } from './model.ts';
import { aiRequestSchema, MAX_BODY, MAX_MESSAGES } from './request.ts';

export type { AiBudget } from './budget.ts';

const MAX_STEPS = 8;
const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 2000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

/** Definições das ferramentas para o modelo, sem `execute`: quem executa é o app. */
export function buildToolSet(): ToolSet {
  return Object.fromEntries(AI_TOOLS.map((t) => [t.name, tool({ description: t.description, inputSchema: t.input })]));
}

/** Limpa toda string dentro de um valor (texto, entrada e saída de ferramenta), sem quebrar a estrutura. */
function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return redactPersonalData(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}

const REDACTED_FIELDS = new Set(['text', 'input', 'output', 'errorText']);

function redactMessages(messages: readonly Record<string, unknown>[]): UIMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: (m.parts as Record<string, unknown>[]).map((p) =>
      Object.fromEntries(Object.entries(p).map(([k, v]) => [k, REDACTED_FIELDS.has(k) ? redactDeep(v) : v])),
    ),
  })) as unknown as UIMessage[];
}

/** Sem detalhe de cache, toda a entrada conta como não cacheada (o lado caro, para o teto não mentir). */
export function toAiUsage(u: LanguageModelUsage): AiUsage {
  const input = u.inputTokens ?? 0;
  const hit = u.inputTokenDetails?.cacheReadTokens ?? 0;
  const miss = u.inputTokenDetails?.noCacheTokens ?? Math.max(0, input - hit);
  return { cacheHitTokens: hit, cacheMissTokens: miss, outputTokens: u.outputTokens ?? 0 };
}

function statusOf(error: unknown): number | string {
  let e = error as { statusCode?: number; name?: string; lastError?: unknown; cause?: unknown } | null;
  for (let i = 0; i < 3 && e && e.statusCode === undefined; i++) e = (e.lastError ?? e.cause) as typeof e;
  return e?.statusCode ?? e?.name ?? 'desconhecido';
}

function providerMessage(error: unknown): string {
  const code = statusOf(error);
  if (code === 429 || code === 503) return `O Glife IA está muito procurado agora. Tente de novo em alguns minutos. (código ${code})`;
  if (code === 402) return 'O Glife IA está sem créditos no provedor. Recarregue a conta da DeepSeek. (código 402)';
  return `O Glife IA não conseguiu responder agora. Tente de novo em instantes. (código ${code})`;
}

export function createHandler(deps: { verify: VerifyJwt; budget: AiBudget; model: LanguageModel; usdBrl: number | null; now?: () => Date }) {
  const now = deps.now ?? (() => new Date());
  const tools = buildToolSet();

  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

    const auth = await requireAal2(req, deps.verify);
    if ('status' in auth) return json({ error: auth.error }, auth.status);

    if (deps.usdBrl === null) return json({ error: 'A IA ainda não foi configurada (cotação do dólar).' }, 503);

    const declared = Number(req.headers.get('Content-Length') ?? '0');
    if (declared > MAX_BODY) return json({ error: 'Conversa grande demais. Comece uma nova.' }, 413);
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: 'Conversa grande demais. Comece uma nova.' }, 413);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = null;
    }
    const parsed = aiRequestSchema.safeParse(raw);
    if (!parsed.success) return json({ error: `Pedido inválido (até ${MAX_MESSAGES} mensagens).` }, 400);

    let budget: { capCents: number; spentCents: number };
    try {
      budget = await deps.budget.status(auth.userId);
    } catch (error) {
      console.error('Glife IA: teto indisponível', { code: (error as Error).message });
      return json({ error: 'Não foi possível conferir o teto da IA agora. Tente de novo.' }, 503);
    }
    if (budget.spentCents >= budget.capCents) return json({ error: 'Você chegou ao teto de gasto da IA deste mês. Ajuste o teto em Ajustes.' }, 402);

    let messages: ModelMessage[];
    try {
      messages = await convertToModelMessages(redactMessages(parsed.data.messages), { tools, ignoreIncompleteToolCalls: true });
    } catch {
      return json({ error: 'Conversa em formato inválido.' }, 400);
    }
    if (parsed.data.today) messages.push({ role: 'system', content: todayMessage(parsed.data.today) });

    const usdBrl = deps.usdBrl;
    const result = streamText({
      model: deps.model,
      instructions: SYSTEM_PROMPT,
      messages,
      allowSystemInMessages: true,
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeout: TIMEOUT_MS,
      abortSignal: req.signal,
      providerOptions: MODEL_PROVIDER_OPTIONS,
      onError: ({ error }) => console.error('Glife IA: erro do provedor', { code: statusOf(error) }),
      onFinish: async ({ totalUsage }) => {
        const usage = toAiUsage(totalUsage);
        const microUsd = costMicroUsd(usage, now());
        try {
          await deps.budget.record(auth.userId, usage, microUsd, microUsdToBrlCents(microUsd, usdBrl));
        } catch (error) {
          console.error('Glife IA: uso não gravado', { code: (error as Error).message });
        }
      },
    });

    const stream = toUIMessageStream({ stream: result.stream, tools, sendReasoning: false, onError: providerMessage });
    return createUIMessageStreamResponse({ headers: CORS, stream });
  };
}
