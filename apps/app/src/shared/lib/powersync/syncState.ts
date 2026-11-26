// Estado da sincronização em linguagem simples (telas Sincronização e Abertura). Regras puras, sem o SDK.

export interface SyncSnapshot {
  /** sincronização configurada (EXPO_PUBLIC_POWERSYNC_URL); sem ela o banco é só deste aparelho */
  enabled: boolean;
  connected: boolean;
  connecting: boolean;
  /** undefined até o banco local abrir e dizer se já houve uma sincronização completa */
  hasSynced: boolean | undefined;
  lastSyncedAt: Date | null;
  uploading: boolean;
  downloading: boolean;
  /** a última tentativa de baixar falhou (sem rede, servidor fora…) */
  failed: boolean;
  /** fração já baixada (0 a 1) durante a sincronização, quando conhecida */
  progress: number | null;
  /** há sessão neste aparelho, mas o servidor não aceita mais o token (precisa entrar de novo) */
  sessionExpired: boolean;
}

export const INITIAL_SYNC: SyncSnapshot = {
  enabled: false,
  connected: false,
  connecting: false,
  hasSynced: undefined,
  lastSyncedAt: null,
  uploading: false,
  downloading: false,
  failed: false,
  progress: null,
  sessionExpired: false,
};

export type SyncScreenState = 'emdia' | 'offline' | 'sessao';

export function syncScreenState(s: SyncSnapshot): SyncScreenState {
  if (s.sessionExpired) return 'sessao';
  if (!s.enabled || (!s.connected && !s.connecting)) return 'offline';
  return 'emdia';
}

export type FirstSyncState = 'none' | 'sincronizando' | 'offline';

/** Só no primeiro acesso do aparelho (`hasSynced` falso); nas aberturas seguintes nada aparece (local-first). */
export function firstSyncState(s: SyncSnapshot, dismissed: boolean): FirstSyncState {
  if (!s.enabled || dismissed || s.hasSynced !== false) return 'none';
  if (s.failed && !s.connected && !s.connecting) return 'offline';
  return 'sincronizando';
}

/** "Começar a usar": assim que as notas chegaram ou a sincronização terminou. */
export function canStartUsing(s: SyncSnapshot, notesCount: number): boolean {
  return s.hasSynced === true || notesCount > 0;
}

/** Nome do item para a fila: só o tipo e o gênero, nunca o conteúdo. */
export interface TableLabel {
  noun: string;
  gender: 'f' | 'm';
}

export type CrudOpName = 'PUT' | 'PATCH' | 'DELETE';

const VERB: Record<CrudOpName, string> = { PUT: 'criad', PATCH: 'editad', DELETE: 'excluíd' };

export function changeLabel(op: CrudOpName, label: TableLabel | undefined): string {
  if (!label) return 'Alteração';
  return `${label.noun} ${VERB[op]}${label.gender === 'f' ? 'a' : 'o'}`;
}

export function lastSyncText(at: Date | null, now: Date): string {
  if (!at) return 'Ainda não houve troca com a nuvem.';
  const sec = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  const ago = sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.floor(sec / 60)} min` : sec < 86400 ? `${Math.floor(sec / 3600)} h` : `${Math.floor(sec / 86400)} d`;
  return `Última troca há ${ago} com a nuvem.`;
}

/** Grupos de "Neste aparelho" (e do progresso da primeira sincronização). */
export type CountGroup = 'notes' | 'transactions' | 'agenda' | 'diet';

/** Rótulo de uma tabela, entregue pelo módulo dono; `count` a inclui num grupo das contagens. */
export interface SyncTableLabel extends TableLabel {
  count?: CountGroup;
}

export function countGroupsOf(labels: Record<string, SyncTableLabel>): Record<CountGroup, string[]> {
  const groups: Record<CountGroup, string[]> = { notes: [], transactions: [], agenda: [], diet: [] };
  for (const [table, l] of Object.entries(labels)) if (l.count) groups[l.count].push(table);
  return groups;
}
