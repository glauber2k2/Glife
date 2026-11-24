// Compras no cartão que viram várias linhas: parcelamento novo, parcelamento já em andamento e saldo anterior
// (cadastro de cartão que já está em uso). Cada parcela cai numa fatura seguida; todas apontam para a primeira.
import { newId } from '../core/index.ts';
import { addMonths, dateInMonth, monthOf, type IsoDate } from './calendar.ts';
import { invoiceMonthFor, type CardCycle } from './invoice.ts';
import type { Account, TransactionDraft } from './model.ts';
import { INSTALLMENTS_MAX, splitInstallments } from './money.ts';

/** Linha pronta para gravar, já com id (as parcelas se referem à primeira pelo id). */
export type PlannedTransaction = Required<TransactionDraft> & { id: string };

interface PurchaseBase {
  card: Account;
  description: string;
  category_id: string | null;
}

function cycleOf(card: Account): CardCycle {
  if (card.kind !== 'credit_card' || card.closing_day === null || card.due_day === null) {
    throw new RangeError('Conta não é cartão de crédito');
  }
  return { closing_day: card.closing_day, due_day: card.due_day };
}

function row(base: PurchaseBase, fields: Partial<PlannedTransaction> & Pick<PlannedTransaction, 'amount_cents' | 'date' | 'invoice_month'>): PlannedTransaction {
  return {
    id: newId(),
    type: 'expense',
    status: 'confirmed',
    account_id: base.card.id,
    to_account_id: null,
    category_id: base.category_id,
    description: base.description,
    installment_of: null,
    installment_index: null,
    installment_count: null,
    recurrence_id: null,
    occurrence_date: null,
    ...fields,
  };
}

/** Mesmo dia `n` meses depois (dia inexistente vira o último dia do mês). */
const shiftMonths = (date: IsoDate, n: number) => dateInMonth(addMonths(monthOf(date), n), Number(date.slice(8, 10)));

function series(base: PurchaseBase, amounts: number[], firstIndex: number, count: number, date: IsoDate, firstInvoice: string) {
  const rows = amounts.map((amount_cents, i) =>
    row(base, {
      amount_cents,
      date: shiftMonths(date, i),
      invoice_month: addMonths(firstInvoice, i),
      installment_index: firstIndex + i,
      installment_count: count,
    }),
  );
  const groupId = rows[0]!.id;
  return rows.map((r) => ({ ...r, installment_of: groupId }));
}

/** Compra nova no cartão; `count = 1` é compra à vista (sem campos de parcela). */
export function planInstallmentPurchase(
  input: PurchaseBase & { totalCents: number; count: number; date: IsoDate },
): PlannedTransaction[] {
  const firstInvoice = invoiceMonthFor(input.date, cycleOf(input.card));
  const amounts = splitInstallments(input.totalCents, input.count);
  if (input.count === 1) return [row(input, { amount_cents: amounts[0]!, date: input.date, invoice_month: firstInvoice })];
  return series(input, amounts, 1, input.count, input.date, firstInvoice);
}

/** Parcelamento que já estava correndo: cria da parcela atual até a última, a atual na fatura em aberto. */
export function planOngoingInstallments(
  input: PurchaseBase & { installmentCents: number; currentIndex: number; count: number; today: IsoDate },
): PlannedTransaction[] {
  const cycle = cycleOf(input.card);
  const { currentIndex, count } = input;
  if (!Number.isInteger(count) || count < 1 || count > INSTALLMENTS_MAX) throw new RangeError('Número de parcelas inválido');
  if (!Number.isInteger(currentIndex) || currentIndex < 1 || currentIndex > count) throw new RangeError('Parcela atual inválida');
  // splitInstallments valida o valor (centavos inteiros); aqui todas as parcelas têm o mesmo valor.
  splitInstallments(input.installmentCents, 1);
  const amounts = Array.from({ length: count - currentIndex + 1 }, () => input.installmentCents);
  return series(input, amounts, currentIndex, count, input.today, invoiceMonthFor(input.today, cycle));
}

/** Valor da fatura atual em aberto ao cadastrar um cartão já em uso. */
export function planPreviousBalance(input: { card: Account; amountCents: number; today: IsoDate }): PlannedTransaction {
  const invoice_month = invoiceMonthFor(input.today, cycleOf(input.card));
  return row(
    { card: input.card, description: 'Saldo anterior', category_id: null },
    { amount_cents: input.amountCents, date: input.today, invoice_month },
  );
}
