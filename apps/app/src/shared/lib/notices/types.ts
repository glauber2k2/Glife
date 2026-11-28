// Porta do agendador de avisos do aparelho (DIP): quem monta os avisos não conhece o SDK de notificações.
import type { NoticeRef, ScheduledNotice } from '@glife/domain/time';

/** Botões do aviso: "Feito" (lembrete), "Registrar" (refeição) e "Adiar" (os dois; o agendador reagenda +10 min). */
export type NoticeAction = 'done' | 'snooze' | 'log';

export interface NoticeActionEvent {
  action: NoticeAction;
  notice: NoticeRef;
}

export interface NoticeScheduler {
  /**
   * Deixa agendados exatamente estes avisos. Os do Glife que sobrarem são cancelados; um adiado só fica se
   * `keepSnoozed` disser que o lembrete/refeição dele ainda está pendente (concluído em qualquer lugar, ele some).
   */
  replaceAll(notices: readonly ScheduledNotice[], keepSnoozed: (ref: NoticeRef) => boolean): Promise<void>;
  /** Sem sessão: cancela todos os avisos do Glife (adiados inclusive) e tira os que estão na gaveta. */
  clearAll(): Promise<void>;
  /** Adia um aviso dentro do app. false = o aparelho/navegador não permite agendá-lo. */
  snooze(notice: ScheduledNotice, at: Date): Promise<boolean>;
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
export const SAFE_NOTICE_ROUTES = new RegExp(`^/(agenda|dieta)(/[a-z]+(/[0-9a-f-]{36})?)?$|^/dieta/registro/novo\\?plano=${UUID}$|^/biblia/planos/${UUID}$`);

/** Registro de refeição já na refeição do plano (aberto pelo botão "Registrar"). */
export const mealLogRoute = (planId: string): string | null => {
  const url = `/dieta/registro/novo?plano=${planId}`;
  return SAFE_NOTICE_ROUTES.test(url) ? url : null;
};

/** Valida o que volta de um aviso (dados do aparelho): só lembrete/refeição com id e data no formato certo. */
export function parseNoticeRef(raw: unknown): NoticeRef | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, id, date, time } = raw as Record<string, unknown>;
  if (kind !== 'reminder' && kind !== 'meal') return null;
  if (typeof id !== 'string' || !new RegExp(`^${UUID}$`).test(id)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (time === undefined) return { kind, id, date };
  // Horário só nos lembretes com várias vezes no dia.
  if (kind !== 'reminder' || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return { kind, id, date, time };
}

/** Aviso agendado como o agendador o vê (só o que importa para decidir o que cancelar). */
export interface ScheduledEntry {
  identifier: string;
  data: Record<string, unknown> | null | undefined;
}

/**
 * Avisos do Glife a cancelar antes de agendar a lista nova: todos os normais e os adiados cujo lembrete/refeição
 * não está mais pendente (ou cujo `ref` é inválido). Avisos de fora (sem `data.glife`) nunca são tocados.
 */
export function staleNotices(scheduled: readonly ScheduledEntry[], keepSnoozed: (ref: NoticeRef) => boolean): string[] {
  return scheduled
    .filter((n) => {
      if (n.data?.glife !== true) return false;
      if (n.data.snoozed !== true) return true;
      const ref = parseNoticeRef(n.data.ref);
      return !ref || !keepSnoozed(ref);
    })
    .map((n) => n.identifier);
}
