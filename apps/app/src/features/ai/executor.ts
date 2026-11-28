// Executa no aparelho uma chamada de ferramenta pedida pelo modelo. A política é aplicada aqui, pelo código:
// ferramenta desconhecida → recusa; entrada inválida → erro ao modelo (nada grava); `needsConfirmation` → só com o
// "Confirmar" do usuário; o que grava vai para o registro de ações (Desfazer). Erros voltam ao modelo como texto
// seguro, sem detalhes técnicos nem dados pessoais.
import { AiToolError, findAiTool, needsConfirmation, type AiExecContext, type AiToolKit, type AiTouch } from '@glife/domain/ai';

import { errorText } from '@/shared/lib/errorText';

export interface AiActionEntry {
  id: string;
  conversation_id: string;
  tool: string;
  summary: string;
  touches: AiTouch[];
  created_at: string;
  undone_at: string | null;
}

export type NewAiAction = Pick<AiActionEntry, 'conversation_id' | 'tool' | 'summary' | 'touches'>;

export interface ActionLog {
  record(entry: NewAiAction): Promise<AiActionEntry>;
}

export interface ExecuteDeps {
  kit: AiToolKit;
  ctx: AiExecContext;
  /** Mostra o cartão "Confirmar?" e resolve com a escolha do usuário. */
  confirm: (summary: string) => Promise<boolean>;
  log: ActionLog;
  conversationId: string;
  /** Avisado de cada ação gravada (cartão com "Desfazer"). */
  onAction?: (entry: AiActionEntry) => void;
}

const issuesText = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) =>
  issues
    .slice(0, 3)
    .map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message))
    .join('; ');

export async function executeToolCall(call: { toolName: string; input: unknown }, deps: ExecuteDeps): Promise<unknown> {
  const def = findAiTool(call.toolName);
  const run = deps.kit.executors[call.toolName];
  if (!def || !run) return { error: 'Ferramenta desconhecida.' };

  const parsed = def.input.safeParse(call.input);
  if (!parsed.success) return { error: `Entrada inválida: ${issuesText(parsed.error.issues)}` };

  try {
    if (needsConfirmation(def)) {
      const preview = deps.kit.preview?.[def.name];
      const summary = preview ? await preview(parsed.data, deps.ctx) : def.description;
      if (!(await deps.confirm(summary))) return { status: 'cancelled' };
    }
    const result = await run(parsed.data, deps.ctx);
    if (result.touches.length > 0) {
      const entry = await deps.log.record({ conversation_id: deps.conversationId, tool: def.name, summary: result.summary, touches: result.touches });
      deps.onAction?.(entry);
    }
    return result.output;
  } catch (e) {
    if (e instanceof AiToolError) return { error: e.message };
    return { error: errorText(e) };
  }
}
