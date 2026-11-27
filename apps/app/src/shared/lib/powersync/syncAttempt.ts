import type { ReconnectResult } from './lifecycle';
import type { SyncResult, SyncSnapshot } from './syncState';

/** Porta mínima: a espera pela troca não depende do SDK nem do banco concreto. */
export interface SyncAttemptSource {
  snapshot: () => SyncSnapshot;
  credentialsRound: () => number;
  subscribe: (listener: (snapshot: SyncSnapshot) => void) => () => void;
  reconnect: () => Promise<ReconnectResult>;
}

/** Falhas antigas não encerram a nova tentativa; sucesso exige uma troca nova e nenhum envio pendente em curso. */
export function runSyncAttempt(source: SyncAttemptSource, timeoutMs: number): Promise<SyncResult> {
  const initial = source.snapshot();
  if (!initial.enabled) return Promise.resolve('disabled');
  const before = initial.lastSyncedAt?.getTime() ?? 0;
  const round = source.credentialsRound();

  return new Promise((resolve) => {
    let settled = false;
    // O SDK mantém erros até uma troca bem-sucedida. Conectar de novo não os torna novos.
    let failureCleared = !initial.failed;
    let unsubscribe = () => {};
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    function finish(result: SyncResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(result);
    }
    const check = (s: SyncSnapshot) => {
      if (settled) return;
      if (!s.failed) failureCleared = true;
      if (source.credentialsRound() > round) {
        if (s.networkError) return finish('failed');
        if (s.sessionExpired) return finish('expired');
      }
      if (failureCleared && s.failed && !s.connecting) return finish('failed');
      if (s.connected && s.hasSynced && !s.failed && !s.uploading && !s.downloading && (s.lastSyncedAt?.getTime() ?? 0) > before) finish('ok');
    };
    unsubscribe = source.subscribe(check);
    // A fonte pode emitir e concluir já durante subscribe; também nesse caso libera o listener.
    if (settled) return unsubscribe();
    void source.reconnect().then(
      (result) => {
        if (result !== 'started') finish(result);
        else check(source.snapshot());
      },
      () => finish('failed'),
    );
  });
}
