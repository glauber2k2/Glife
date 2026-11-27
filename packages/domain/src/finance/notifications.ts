// O que Finanças leva à central de notificações: fatura que vence em até 7 dias (ou já venceu e falta pagar) e
// previsto atrasado. O valor vem formatado de fora: com o olhinho fechado, a central mostra "R$ ••••".
import { dayMonth, localInstant, type AppNotification } from '../notifications/index.ts';
import { daysBetween } from '../time/index.ts';
import { addDays, compareDates, type IsoDate } from './calendar.ts';
import { collectOccurrences, invoiceDues, plannedItems, type FinanceData, type PlannedItem } from './overview.ts';

/** Quantos dias antes do vencimento a fatura aparece. */
export const INVOICE_NOTICE_DAYS = 7;
/** Até quanto tempo depois do vencimento a fatura em aberto continua aparecendo. */
const OVERDUE_LOOKBACK_DAYS = 30;

const dueIn = (days: number) => (days === 0 ? 'vence hoje' : days === 1 ? 'vence amanhã' : `vence em ${days} dias`);

export function financeNotifications(data: FinanceData, now: { date: IsoDate }, money: (cents: number) => string): AppNotification[] {
  const today = now.date;
  const out: AppNotification[] = [];
  const occurrences = collectOccurrences(data, today);
  const names = new Map(data.accounts.map((a) => [a.id, a.name]));

  for (const due of invoiceDues(data, occurrences, today, addDays(today, -OVERDUE_LOOKBACK_DAYS), addDays(today, INVOICE_NOTICE_DAYS))) {
    const late = compareDates(due.dueDate, today) < 0;
    const name = names.get(due.cardId) ?? 'cartão';
    out.push({
      id: `invoice:${due.cardId}:${due.invoiceMonth}`,
      module: 'finance',
      title: late ? `Fatura do ${name} venceu` : `Fatura do ${name} ${dueIn(daysBetween(today, due.dueDate))}`,
      message: `${money(due.remaining)} · ${late ? 'venceu' : 'vence'} em ${dayMonth(due.dueDate)}`,
      at: localInstant(late ? addDays(due.dueDate, 1) : addDays(due.dueDate, -INVOICE_NOTICE_DAYS)),
      route: `/financas/fatura/${due.cardId}?mes=${due.invoiceMonth}`,
      action: { label: 'Pagar', kind: 'open' },
    });
  }

  for (const item of overduePlanned(data, occurrences, today)) {
    out.push({
      id: `planned:${item.key}`,
      module: 'finance',
      title: `${item.description || 'Previsto'} em atraso`,
      message: `Venceu em ${dayMonth(item.date)} · ${money(item.amount_cents)} · ainda não confirmado`,
      at: localInstant(addDays(item.date, 1)),
      route: '/financas',
      action: { label: 'Confirmar', kind: 'resolve' },
    });
  }
  return out;
}

/** Previstos (gravados ou da recorrência) com data antes de hoje. */
export function overduePlanned(data: FinanceData, occurrences: ReturnType<typeof collectOccurrences>, today: IsoDate): PlannedItem[] {
  return plannedItems(data.transactions, occurrences).filter((i) => compareDates(i.date, today) < 0);
}
