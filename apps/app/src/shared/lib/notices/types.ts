// Porta do agendador de avisos do aparelho (DIP): quem monta os avisos não conhece o SDK de notificações.
import type { NoticeRef, ScheduledNotice } from '@glife/domain/time';

/** Botões do aviso: "Feito" (lembrete), "Registrar" (refeição) e "Adiar" (os dois; o agendador reagenda +10 min). */
export type NoticeAction = 'done' | 'snooze' | 'log';

export interface NoticeActionEvent {
  action: NoticeAction;
  notice: NoticeRef;
}

export interface NoticeScheduler {
  /** Deixa agendados exatamente estes avisos (os do Glife que sobrarem são cancelados; os adiados ficam). */
  replaceAll(notices: readonly ScheduledNotice[]): Promise<void>;
  /** Avisa quando a pessoa toca num aviso; devolve a rota segura a abrir. */
  onOpen(listener: (url: string) => void): () => void;
  /** Avisa quando a pessoa usa um botão do aviso (o "Adiar" já foi reagendado pelo próprio agendador). */
  onAction(listener: (event: NoticeActionEvent) => void): () => void;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Só rotas do próprio app abertas por aviso (nada vindo de fora vira navegação): telas da agenda e da dieta, com id
 * opcional, e o registro de refeição já ligado a uma refeição do plano.
 */
export const SAFE_NOTICE_ROUTES = new RegExp(`^/(agenda|dieta)(/[a-z]+(/[0-9a-f-]{36})?)?$|^/dieta/registro/novo\\?plano=${UUID}$`);

/** Registro de refeição já na refeição do plano (aberto pelo botão "Registrar"). */
export const mealLogRoute = (planId: string): string | null => {
  const url = `/dieta/registro/novo?plano=${planId}`;
  return SAFE_NOTICE_ROUTES.test(url) ? url : null;
};

/** Valida o que volta de um aviso (dados do aparelho): só lembrete/refeição com id e data no formato certo. */
export function parseNoticeRef(raw: unknown): NoticeRef | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, id, date } = raw as Record<string, unknown>;
  if (kind !== 'reminder' && kind !== 'meal') return null;
  if (typeof id !== 'string' || !new RegExp(`^${UUID}$`).test(id)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { kind, id, date };
}
