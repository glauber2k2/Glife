// Liga a sincronização ao estado de acesso: conecta só com MFA concluído; ao sair, apaga o banco local.

export type SyncStage = 'signed_out' | 'enroll_mfa' | 'verify_mfa' | 'ready';

export interface SyncDatabase<C = unknown> {
  connect: (connector: C) => Promise<void>;
  disconnect: () => Promise<void>;
  disconnectAndClear: () => Promise<void>;
}

type Action = 'connect' | 'disconnect' | 'clear';

const ACTION: Record<SyncStage, Action> = {
  ready: 'connect',
  // Sessão só com senha: pausa a sincronização, mas mantém os dados (é o mesmo usuário verificando o código).
  enroll_mfa: 'disconnect',
  verify_mfa: 'disconnect',
  // Saiu: nenhum dado pessoal fica no aparelho.
  signed_out: 'clear',
};

export function createSyncController<C>(
  db: SyncDatabase<C>,
  connector: C,
  onError: (e: unknown) => void = () => {},
) {
  let last: Action | null = null;
  let queue: Promise<void> = Promise.resolve();

  return {
    /** Aplica o estado em ordem; repetir o mesmo estado não faz nada. */
    apply(stage: SyncStage): Promise<void> {
      const action = ACTION[stage];
      queue = queue.then(async () => {
        if (action === last) return;
        try {
          if (action === 'connect') await db.connect(connector);
          else if (action === 'disconnect') await db.disconnect();
          else await db.disconnectAndClear();
          last = action;
        } catch (e) {
          last = null;
          onError(e);
        }
      });
      return queue;
    },
    /** "Sincronizar agora": reconecta (envia a fila e baixa) só se a sincronização estiver ligada. */
    reconnect(): Promise<void> {
      queue = queue.then(async () => {
        if (last !== 'connect') return;
        try {
          await db.connect(connector);
        } catch (e) {
          onError(e);
        }
      });
      return queue;
    },
  };
}
