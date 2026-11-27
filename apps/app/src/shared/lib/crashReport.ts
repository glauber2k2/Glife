// Último erro que derrubou o app (só no aparelho, nunca enviado): guardado antes de o app fechar e mostrado uma vez
// na abertura seguinte, para a pessoa poder fotografar e mandar. TS puro; o armazenamento (AsyncStorage) e o
// `ErrorUtils` do React Native são injetados pela raiz.
import type { KeyValueStorage } from '../ui/theme/preferenceStore';

const KEY = 'glife.crash.last';
/** Tamanho máximo guardado (mensagem + começo da pilha). */
const MAX = 1500;
/** Tempo máximo esperando a gravação antes de deixar o app fechar. */
const WRITE_WAIT_MS = 800;

export interface CrashReport {
  at: string;
  message: string;
}

type Handler = (error: unknown, isFatal?: boolean) => void;
export interface GlobalErrorUtils {
  getGlobalHandler(): Handler;
  setGlobalHandler(handler: Handler): void;
}

/** Texto curto do erro: nome, mensagem e as primeiras linhas da pilha. */
export function describeCrash(error: unknown): string {
  const e = error instanceof Error ? error : new Error(String(error));
  const stack = (e.stack ?? '').split('\n').slice(0, 8).join('\n');
  const head = `${e.name}: ${e.message}`;
  const text = stack.startsWith(head) ? stack : `${head}\n${stack}`;
  return text.trim().slice(0, MAX);
}

export function parseCrash(raw: string | null): CrashReport | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    const { at, message } = v as Record<string, unknown>;
    if (typeof at !== 'string' || typeof message !== 'string' || !message) return null;
    return { at: at.slice(0, 40), message: message.slice(0, MAX) };
  } catch {
    return null;
  }
}

/** Erro fatal: grava (esperando no máximo um instante) e só então deixa o tratamento padrão fechar o app. */
export function installCrashReport(storage: KeyValueStorage, errorUtils: GlobalErrorUtils | undefined, now = () => new Date()): void {
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) return previous(error, isFatal);
    const report: CrashReport = { at: now().toISOString(), message: describeCrash(error) };
    const write = storage.setItem(KEY, JSON.stringify(report)).catch(() => undefined);
    const wait = new Promise((resolve) => setTimeout(resolve, WRITE_WAIT_MS));
    void Promise.race([write, wait]).then(() => previous(error, isFatal));
  });
}

/** O erro guardado (uma vez: ao ler, apaga). Falha de armazenamento = nada a mostrar. */
export async function takeCrashReport(storage: KeyValueStorage): Promise<CrashReport | null> {
  try {
    const report = parseCrash(await storage.getItem(KEY));
    if (report) await storage.setItem(KEY, '');
    return report;
  } catch {
    return null;
  }
}
