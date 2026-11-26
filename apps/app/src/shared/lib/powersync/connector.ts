// Conector entre o PowerSync e o Supabase: entrega o token da sessão e envia a fila local de alterações.
// Sem importar o SDK: os tipos abaixo são o subconjunto que usamos (compatível com @powersync/common).

export type CrudOpType = 'PUT' | 'PATCH' | 'DELETE';

export interface CrudOp {
  op: CrudOpType;
  table: string;
  id: string;
  opData?: Record<string, unknown>;
}

export interface CrudTx {
  crud: CrudOp[];
  complete: () => Promise<void>;
}

type Result = PromiseLike<{ error: unknown }>;

/** Subconjunto do cliente Supabase usado no envio (a RLS do banco decide o que é aceito). */
export interface UploadClient {
  from: (table: string) => {
    upsert: (row: Record<string, unknown>) => Result;
    update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Result };
    delete: () => { eq: (column: string, value: string) => Result };
  };
}

export interface SessionSource {
  auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> };
}

export interface DiscardInfo {
  table: string;
  op: CrudOpType;
  code: string;
}

/**
 * Erros que nunca vão dar certo ao repetir: dados inválidos (22xxx), integridade (23xxx) e permissão/RLS (42501).
 * Repetir travaria a fila para sempre; a alteração é descartada e a próxima sincronização restaura o dado do servidor.
 */
const FATAL = [/^22...$/, /^23...$/, /^42501$/];

export function isFatalUploadError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && FATAL.some((re) => re.test(code));
}

async function applyOp(client: UploadClient, op: CrudOp) {
  const table = client.from(op.table);
  const { error } =
    op.op === 'PUT'
      ? await table.upsert({ ...op.opData, id: op.id })
      : op.op === 'PATCH'
        ? await table.update(op.opData ?? {}).eq('id', op.id)
        : await table.delete().eq('id', op.id);
  if (error) throw error;
}

/** Aplica uma transação da fila. Erro temporário: relança (o SDK tenta de novo). Erro definitivo: descarta. */
export async function uploadTransaction(tx: CrudTx, client: UploadClient, onDiscard?: (info: DiscardInfo) => void) {
  let current: CrudOp | undefined;
  try {
    for (const op of tx.crud) {
      current = op;
      await applyOp(client, op);
    }
    await tx.complete();
  } catch (e) {
    if (!isFatalUploadError(e) || !current) throw e;
    // Registra só metadados: nunca o conteúdo da linha.
    onDiscard?.({ table: current.table, op: current.op, code: (e as { code: string }).code });
    await tx.complete();
  }
}

/** Nível de verificação da sessão, lido do token (sem rede). */
export function sessionAal(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const aal = (JSON.parse(json) as { aal?: unknown }).aal;
    return typeof aal === 'string' ? aal : null;
  } catch {
    return null;
  }
}

export interface ConnectorOptions {
  supabase: SessionSource;
  /** URL da instância PowerSync (EXPO_PUBLIC_POWERSYNC_URL) */
  endpoint: string;
  client: UploadClient;
  onDiscard?: (info: DiscardInfo) => void;
  /** avisa se o servidor ainda pode receber a sessão deste aparelho (false = precisa entrar de novo) */
  onCredentials?: (ok: boolean) => void;
}

export function createSupabaseConnector({ supabase, endpoint, client, onDiscard, onCredentials }: ConnectorOptions) {
  return {
    /** Token só de sessão com MFA: o banco recusa aal1, e o PowerSync também não deve entregar dados a ela. */
    async fetchCredentials() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || sessionAal(token) !== 'aal2') {
        onCredentials?.(false);
        return null;
      }
      onCredentials?.(true);
      return { endpoint, token };
    },
    async uploadData(db: { getNextCrudTransaction: () => Promise<CrudTx | null> }) {
      const tx = await db.getNextCrudTransaction();
      if (tx) await uploadTransaction(tx, client, onDiscard);
    },
  };
}

export type SupabaseConnector = ReturnType<typeof createSupabaseConnector>;
