// Porta do agendador de avisos do aparelho (DIP): quem monta os avisos não conhece o SDK de notificações.
import type { ScheduledNotice } from '@glife/domain/time';

export interface NoticeScheduler {
  /** Deixa agendados exatamente estes avisos (os do Glife que sobrarem são cancelados). */
  replaceAll(notices: readonly ScheduledNotice[]): Promise<void>;
  /** Avisa quando a pessoa toca num aviso; devolve a rota segura a abrir. */
  onOpen(listener: (url: string) => void): () => void;
}

/** Só rotas do próprio app abertas por aviso (nada vindo de fora vira navegação). */
export const SAFE_NOTICE_ROUTES = /^\/(agenda|dieta)(\/[a-z]+(\/[0-9a-f-]{36})?)?$/;
