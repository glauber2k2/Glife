// Contas a partir das linhas: saldo real, orçamento pelo mês em que é pago, situação da fatura e previsão.
// Sem contagem dupla: compra no cartão pesa no orçamento (mês da fatura); o pagamento da fatura é transferência
// e a conta pagadora só sente o cartão pelo valor restante da fatura, no vencimento.
import { compareDates, monthOf, type IsoDate, type Month } from './calendar.ts';
import { invoiceDates, invoiceMonthFor, type CardCycle } from './invoice.ts';
import type { Account, Budget, Transaction, TransactionDraft, TxStatus } from './model.ts';
import type { Occurrence } from './recurrence.ts';

const alive = (t: Transaction) => t.deleted_at === null;
const isCard = (a: Pick<Account, 'kind'>) => a.kind === 'credit_card';

function cycleOf(card: Account): CardCycle {
  if (!isCard(card) || card.closing_day === null || card.due_day === null) throw new RangeError('Conta não é cartão de crédito');
  return { closing_day: card.closing_day, due_day: card.due_day };
}

/** Mês do orçamento: o da fatura (cartão) ou o da data. Transferência e pulado não contam. */
export function budgetMonth(tx: Pick<Transaction, 'type' | 'status' | 'invoice_month' | 'date'>): Month | null {
  if (tx.type === 'transfer' || tx.status === 'skipped') return null;
  return tx.invoice_month ?? monthOf(tx.date);
}

/** Efeito de um movimento numa conta (positivo = entra). Cartão: positivo = dívida diminui. */
function effectOn(accountId: string, m: Pick<Transaction, 'type' | 'account_id' | 'to_account_id' | 'amount_cents'>): number {
  if (m.type === 'transfer') {
    if (m.account_id === accountId) return -m.amount_cents;
    if (m.to_account_id === accountId) return m.amount_cents;
    return 0;
  }
  if (m.account_id !== accountId) return 0;
  return m.type === 'income' ? m.amount_cents : -m.amount_cents;
}

/** Saldo real (só confirmados). Cartão devolve a dívida: compras − estornos − pagamentos. */
export function accountBalance(account: Account, txs: readonly Transaction[]): number {
  const net = txs
    .filter((t) => alive(t) && t.status === 'confirmed')
    .reduce((sum, t) => sum + effectOn(account.id, t), account.initial_balance_cents);
  return isCard(account) ? 0 - net : net; // 0 - net evita -0
}

export function isOverdue(item: { status: TxStatus; date: IsoDate }, today: IsoDate): boolean {
  return item.status === 'planned' && compareDates(item.date, today) < 0;
}

// ---------- Fatura ----------

export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'partial' | 'overdue';

export interface InvoiceSummary {
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
  closingDate: IsoDate;
  dueDate: IsoDate;
}

/** Ocorrências calculadas (não gravadas) ainda previstas. */
const pendingOccurrences = (occurrences: readonly Occurrence[]) =>
  occurrences.filter((o) => o.materialized === null && o.status === 'planned');

function invoiceTotals(card: Account, month: Month, txs: readonly Transaction[], occurrences: readonly Occurrence[]) {
  const cycle = cycleOf(card);
  const sign = (type: Transaction['type']) => (type === 'expense' ? 1 : type === 'income' ? -1 : 0);
  const fromRows = txs
    .filter((t) => alive(t) && t.status !== 'skipped' && t.account_id === card.id && t.invoice_month === month)
    .reduce((s, t) => s + sign(t.type) * t.amount_cents, 0);
  const fromRules = pendingOccurrences(occurrences)
    .filter((o) => o.account_id === card.id && invoiceMonthFor(o.date, cycle) === month)
    .reduce((s, o) => s + sign(o.type) * o.amount_cents, 0);
  const payments = (statuses: TxStatus[]) =>
    txs
      .filter((t) => alive(t) && statuses.includes(t.status) && t.type === 'transfer' && t.to_account_id === card.id && t.invoice_month === month)
      .reduce((s, t) => s + t.amount_cents, 0);
  return { total: fromRows + fromRules, paid: payments(['confirmed']), paidOrPlanned: payments(['confirmed', 'planned']) };
}

export function invoiceSummary(
  card: Account,
  invoiceMonth: Month,
  txs: readonly Transaction[],
  today: IsoDate,
  occurrences: readonly Occurrence[] = [],
): InvoiceSummary {
  const { closingDate, dueDate } = invoiceDates(invoiceMonth, cycleOf(card));
  const { total, paid } = invoiceTotals(card, invoiceMonth, txs, occurrences);
  const remaining = Math.max(0, total - paid);
  let status: InvoiceStatus;
  if (compareDates(today, closingDate) < 0) status = 'open';
  else if (remaining === 0) status = 'paid';
  else if (compareDates(today, dueDate) > 0) status = 'overdue';
  else status = paid > 0 ? 'partial' : 'closed';
  return { total, paid, remaining, status, closingDate, dueDate };
}

const invoiceMonthsOf = (card: Account, txs: readonly Transaction[]) =>
  [...new Set(txs.filter((t) => alive(t) && t.invoice_month !== null && (t.account_id === card.id || t.to_account_id === card.id)).map((t) => t.invoice_month!))].sort();

/** Fatura fechada mais antiga ainda com valor a pagar. */
export function suggestInvoiceToPay(card: Account, txs: readonly Transaction[], today: IsoDate): Month | null {
  for (const month of invoiceMonthsOf(card, txs)) {
    const s = invoiceSummary(card, month, txs, today);
    if (s.status !== 'open' && s.remaining > 0) return month;
  }
  return null;
}

/**
 * Pago por outra pessoa (não saiu dinheiro de nenhuma conta sua): uma entrada na conta compensa a saída, e o saldo
 * não muda. Fatura: entrada + pagamento (transferência para o cartão), e a fatura fica paga. Conta a pagar: só a
 * entrada; o gasto é confirmado à parte e continua no orçamento.
 */
export function paidByOther(p: {
  accountId: string;
  cents: number;
  date: IsoDate;
  who?: string | null;
  label?: string;
  invoice?: { cardId: string; month: Month; description?: string };
}): TransactionDraft[] {
  if (!Number.isInteger(p.cents) || p.cents <= 0) throw new RangeError('Valor inválido');
  const who = p.who?.trim();
  const description = who ? `Pago por ${who}` : p.label ? `${p.label} · pago por outra pessoa` : 'Pago por outra pessoa';
  const income: TransactionDraft = { type: 'income', amount_cents: p.cents, date: p.date, account_id: p.accountId, description };
  if (!p.invoice) return [income];
  const payment: TransactionDraft = {
    type: 'transfer',
    amount_cents: p.cents,
    date: p.date,
    account_id: p.accountId,
    to_account_id: p.invoice.cardId,
    invoice_month: p.invoice.month,
    description: p.invoice.description ?? 'Pagamento da fatura',
  };
  return [income, payment];
}

// ---------- Orçamento ----------

export interface Bucket {
  confirmed: number;
  planned: number;
}

export interface MonthSummary {
  income: Bucket;
  expense: Bucket;
  /** Gasto líquido por categoria (estorno abate); `null` = sem categoria. */
  byCategory: Map<string | null, Bucket>;
}

export function monthSummary(
  month: Month,
  data: { transactions: readonly Transaction[]; occurrences: readonly Occurrence[]; accounts: readonly Account[] },
): MonthSummary {
  const cards = new Map(data.accounts.filter(isCard).map((a) => [a.id, a]));
  const summary: MonthSummary = { income: { confirmed: 0, planned: 0 }, expense: { confirmed: 0, planned: 0 }, byCategory: new Map() };
  const add = (m: { type: Transaction['type']; account_id: string; category_id: string | null; amount_cents: number }, key: keyof Bucket) => {
    // Receita no cartão é estorno: abate o gasto em vez de contar como ganho.
    const refund = m.type === 'income' && cards.has(m.account_id);
    if (m.type === 'income' && !refund) {
      summary.income[key] += m.amount_cents;
      return;
    }
    const value = refund ? -m.amount_cents : m.amount_cents;
    summary.expense[key] += value;
    const bucket = summary.byCategory.get(m.category_id) ?? { confirmed: 0, planned: 0 };
    bucket[key] += value;
    summary.byCategory.set(m.category_id, bucket);
  };
  for (const t of data.transactions) {
    if (alive(t) && budgetMonth(t) === month) add(t, t.status === 'confirmed' ? 'confirmed' : 'planned');
  }
  for (const o of pendingOccurrences(data.occurrences)) {
    if (o.type === 'transfer') continue;
    const card = cards.get(o.account_id);
    const m = card ? invoiceMonthFor(o.date, cycleOf(card)) : monthOf(o.date);
    if (m === month) add(o, 'planned');
  }
  return summary;
}

/** Orçamento da categoria no mês: o registro mais recente com `starts_month` até o mês. */
export function budgetFor(categoryId: string, month: Month, budgets: readonly Budget[]): number | null {
  const valid = budgets
    .filter((b) => b.deleted_at === null && b.category_id === categoryId && b.starts_month <= month)
    .sort((a, b) => (a.starts_month < b.starts_month ? 1 : -1));
  return valid[0]?.amount_cents ?? null;
}

// ---------- Previsão ----------

/**
 * Saldo esperado de uma conta (não cartão) em `until`: saldo real + previstos com data até lá (inclusive atrasados)
 * + ocorrências calculadas + o restante das faturas dos cartões que ela paga, no vencimento.
 */
export function projectBalance(
  account: Account,
  until: IsoDate,
  data: { transactions: readonly Transaction[]; occurrences: readonly Occurrence[]; cards: readonly Account[] },
): number {
  if (isCard(account)) throw new RangeError('Previsão é da conta que paga, não do cartão');
  const cardIds = new Set(data.cards.map((c) => c.id));
  const due = (date: IsoDate) => compareDates(date, until) <= 0;
  let balance = accountBalance(account, data.transactions);
  for (const t of data.transactions) {
    if (alive(t) && t.status === 'planned' && due(t.date) && !cardIds.has(t.account_id)) balance += effectOn(account.id, t);
  }
  for (const o of pendingOccurrences(data.occurrences)) {
    if (due(o.date) && !cardIds.has(o.account_id)) balance += effectOn(account.id, o);
  }
  for (const card of data.cards.filter((c) => c.payment_account_id === account.id)) {
    const cycle = cycleOf(card);
    const months = new Set([
      ...invoiceMonthsOf(card, data.transactions),
      ...pendingOccurrences(data.occurrences)
        .filter((o) => o.account_id === card.id)
        .map((o) => invoiceMonthFor(o.date, cycle)),
    ]);
    for (const month of months) {
      if (!due(invoiceDates(month, cycle).dueDate)) continue;
      const { total, paidOrPlanned } = invoiceTotals(card, month, data.transactions, data.occurrences);
      balance -= Math.max(0, total - paidOrPlanned);
    }
  }
  return balance;
}
