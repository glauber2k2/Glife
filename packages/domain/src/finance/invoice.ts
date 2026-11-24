// Ciclo da fatura do cartão. Compra antes do fechamento cai na fatura que fecha naquele mês; no dia do fechamento
// ou depois, na seguinte. A fatura é identificada pelo mês do VENCIMENTO (`invoice_month`).
import { addMonths, compareDates, dateInMonth, monthOf, type IsoDate, type Month } from './calendar.ts';

export interface CardCycle {
  closing_day: number;
  due_day: number;
}

/** Mês da fatura (mês do vencimento) em que cai uma compra feita em `purchase`. */
export function invoiceMonthFor(purchase: IsoDate, card: CardCycle): Month {
  let closing = dateInMonth(monthOf(purchase), card.closing_day);
  if (compareDates(purchase, closing) >= 0) closing = dateInMonth(addMonths(monthOf(purchase), 1), card.closing_day);
  let due = dateInMonth(monthOf(closing), card.due_day);
  if (compareDates(due, closing) <= 0) due = dateInMonth(addMonths(monthOf(closing), 1), card.due_day);
  return monthOf(due);
}

/** Fechamento e vencimento da fatura do mês `invoiceMonth`, com os dias atuais do cartão. */
export function invoiceDates(invoiceMonth: Month, card: CardCycle): { closingDate: IsoDate; dueDate: IsoDate } {
  const dueDate = dateInMonth(invoiceMonth, card.due_day);
  let closingDate = dateInMonth(invoiceMonth, card.closing_day);
  if (compareDates(closingDate, dueDate) >= 0) closingDate = dateInMonth(addMonths(invoiceMonth, -1), card.closing_day);
  return { closingDate, dueDate };
}
