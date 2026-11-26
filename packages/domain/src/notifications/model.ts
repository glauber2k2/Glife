// Central de notificações: o que cada módulo tem para avisar agora (fatura a vencer, previsto atrasado, lembrete,
// refeição). Cada feature monta os seus itens com funções puras; o app junta e mostra o feed. Nada disso é gravado:
// o feed é derivado dos dados e só o "visto até" (instante) fica no aparelho.

export type NotificationModule = 'finance' | 'agenda' | 'diet';

/** open — abre `route` (Pagar, Registrar) · resolve — a feature resolve na hora (Confirmar, Feito). */
export type NotificationActionKind = 'open' | 'resolve';

export interface AppNotification {
  /** estável entre leituras (ex.: `reminder:<id>:<data>`) */
  id: string;
  module: NotificationModule;
  title: string;
  message: string;
  /** quando passou a valer (ou quando vai acontecer, se ainda hoje) */
  at: Date;
  /** rota do app aberta ao tocar na linha */
  route?: string;
  /** ação direto na linha */
  action?: { label: string; kind: NotificationActionKind };
}

/** O que cada feature entrega à central: os itens e como resolver um deles na hora (ação `resolve`). */
export interface NotificationSource {
  items: readonly AppNotification[];
  resolve(id: string): Promise<void>;
}

/** Itens com mais de 30 dias somem do feed. */
export const FEED_MAX_AGE_DAYS = 30;

/** "AAAA-MM-DD" + "HH:MM" como instante na hora local do aparelho. */
export function localInstant(date: string, time = '00:00'): Date {
  return new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5)));
}

/** "24/11" */
export const dayMonth = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
