// Visão das telas de Finanças, calculada a partir das linhas: início do mês (saldo, esperado, a confirmar,
// próximos, cartões, orçamento, últimos), extrato de uma conta e próxima ocorrência de cada regra.
// Só números e datas; textos e cores ficam no app.
import { addDays, addMonths, compareDates, dateInMonth, daysInMonth, monthOf, type IsoDate, type Month } from './calendar.ts';
import { currentInvoiceMonth } from './installments.ts';
import { invoiceDates, invoiceMonthFor, type CardCycle } from './invoice.ts';
import { accountBalance, budgetFor, invoiceSummary, monthSummary, projectBalance, type InvoiceSummary } from './ledger.ts';
import type { Account, Budget, Category, Recurrence, Transaction, TxType } from './model.ts';
import { expandRecurrence, type Occurrence } from './recurrence.ts';

export interface FinanceData {
  accounts: readonly Account[];
  categories: readonly Category[];
  /** Todas as transações não excluídas do dono. */
  transactions: readonly Transaction[];
  rules: readonly Recurrence[];
  budgets: readonly Budget[];
}

const isCard = (a: Pick<Account, 'kind'>) => a.kind === 'credit_card';
const alive = <T extends { deleted_at: string | null }>(r: T) => r.deleted_at === null;

export function cycleOf(card: Account): CardCycle {
  if (!isCard(card) || card.closing_day === null || card.due_day === null) throw new RangeError('Conta não é cartão de crédito');
  return { closing_day: card.closing_day, due_day: card.due_day };
}

export function lastDayOf(month: Month): IsoDate {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return dateInMonth(month, daysInMonth(y, m));
}

/**
 * Regra ainda ativa: sem fim, ou com fim depois do mês corrente. Encerrar ("depois deste mês" ou "já neste mês")
 * põe o fim neste mês, e a regra sai das ativas na hora; a ocorrência que ainda falta no mês segue como prevista.
 */
export function isRecurrenceActive(rule: { end_date: IsoDate | null }, today: IsoDate): boolean {
  return rule.end_date === null || rule.end_date > lastDayOf(monthOf(today));
}

/** Ocorrências de todas as regras, do início de cada uma até `until`, já casadas com as linhas gravadas. */
export function collectOccurrences(data: Pick<FinanceData, 'rules' | 'transactions'>, until: IsoDate): Occurrence[] {
  const byRule = new Map<string, Transaction[]>();
  for (const t of data.transactions) {
    if (t.recurrence_id === null) continue;
    const list = byRule.get(t.recurrence_id) ?? [];
    list.push(t);
    byRule.set(t.recurrence_id, list);
  }
  return data.rules
    .filter(alive)
    .flatMap((rule) => expandRecurrence(rule, rule.start_date, until, byRule.get(rule.id) ?? []));
}

/** Um previsto na tela: linha gravada como prevista ou ocorrência calculada de uma regra. */
export interface PlannedItem {
  /** Id da linha (gravada) ou da ocorrência (id determinístico, ainda sem linha). */
  key: string;
  transactionId: string | null;
  recurrenceId: string | null;
  occurrenceDate: IsoDate | null;
  type: TxType;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  description: string;
  amount_cents: number;
  date: IsoDate;
  installment_index: number | null;
  installment_count: number | null;
}

export function plannedItems(transactions: readonly Transaction[], occurrences: readonly Occurrence[]): PlannedItem[] {
  const fromRows: PlannedItem[] = transactions
    .filter((t) => alive(t) && t.status === 'planned')
    .map((t) => ({
      key: t.id,
      transactionId: t.id,
      recurrenceId: t.recurrence_id,
      occurrenceDate: t.occurrence_date,
      type: t.type,
      account_id: t.account_id,
      to_account_id: t.to_account_id,
      category_id: t.category_id,
      description: t.description,
      amount_cents: t.amount_cents,
      date: t.date,
      installment_index: t.installment_index,
      installment_count: t.installment_count,
    }));
  const fromRules: PlannedItem[] = occurrences
    .filter((o) => o.materialized === null && o.status === 'planned')
    .map((o) => ({
      key: o.id,
      transactionId: null,
      recurrenceId: o.recurrence_id,
      occurrenceDate: o.occurrence_date,
      type: o.type,
      account_id: o.account_id,
      to_account_id: o.to_account_id,
      category_id: o.category_id,
      description: o.description,
      amount_cents: o.amount_cents,
      date: o.date,
      installment_index: null,
      installment_count: null,
    }));
  return [...fromRows, ...fromRules].sort((a, b) => compareDates(a.date, b.date) || (a.key < b.key ? -1 : 1));
}

/** Fatura a vencer que aparece como "Próximo" na conta que paga. */
export interface InvoiceDue {
  cardId: string;
  payerId: string | null;
  invoiceMonth: Month;
  dueDate: IsoDate;
  remaining: number;
}

export interface CardOverview {
  card: Account;
  invoiceMonth: Month;
  summary: InvoiceSummary;
}

export interface BudgetRow {
  category: Category;
  spent: number;
  planned: number;
  budget: number | null;
}

export interface MonthOverview {
  month: Month;
  isCurrentMonth: boolean;
  endDate: IsoDate;
  /** Soma das contas (cartão fica fora: é dívida). */
  balanceToday: number;
  /** Saldo esperado no fim do mês (previstos, atrasados e faturas a vencer). */
  expected: number;
  toConfirm: PlannedItem[];
  upcoming: (PlannedItem | InvoiceDue)[];
  cards: CardOverview[];
  budgets: BudgetRow[];
  recent: Transaction[];
}

export const isInvoiceDue = (x: PlannedItem | InvoiceDue): x is InvoiceDue => 'invoiceMonth' in x;

/** Meses de fatura com movimento ou previsto no cartão. */
function invoiceMonthsWithActivity(card: Account, txs: readonly Transaction[], occurrences: readonly Occurrence[]): Month[] {
  const cycle = cycleOf(card);
  const months = new Set<Month>();
  for (const t of txs) {
    if (alive(t) && t.invoice_month !== null && (t.account_id === card.id || t.to_account_id === card.id)) months.add(t.invoice_month);
  }
  for (const o of occurrences) {
    if (o.materialized === null && o.status === 'planned' && o.account_id === card.id) months.add(invoiceMonthFor(o.date, cycle));
  }
  return [...months].sort();
}

/** Fatura que o cartão mostra no início: a vencida mais antiga, senão a atual (a seguinte se a atual já foi paga). */
export function invoiceToShow(card: Account, month: Month, today: IsoDate, txs: readonly Transaction[], occurrences: readonly Occurrence[]): Month {
  if (month !== monthOf(today)) return month;
  const cycle = cycleOf(card);
  const current = currentInvoiceMonth(today, cycle);
  const overdue = invoiceMonthsWithActivity(card, txs, occurrences).find(
    (m) => m < current && invoiceSummary(card, m, txs, today, occurrences).status === 'overdue',
  );
  if (overdue) return overdue;
  const s = invoiceSummary(card, current, txs, today, occurrences);
  return s.status === 'paid' && s.total > 0 ? addMonths(current, 1) : current;
}

/** Faturas com valor a pagar que vencem entre `from` e `to` (inclusive). */
export function invoiceDues(data: FinanceData, occurrences: readonly Occurrence[], today: IsoDate, from: IsoDate, to: IsoDate): InvoiceDue[] {
  const out: InvoiceDue[] = [];
  for (const card of data.accounts.filter((a) => alive(a) && isCard(a))) {
    const cycle = cycleOf(card);
    const months = new Set(invoiceMonthsWithActivity(card, data.transactions, occurrences));
    for (const m of [monthOf(from), monthOf(to)]) months.add(m);
    for (const m of months) {
      const { dueDate } = invoiceDates(m, cycle);
      if (compareDates(dueDate, from) < 0 || compareDates(dueDate, to) > 0) continue;
      const s = invoiceSummary(card, m, data.transactions, today, occurrences);
      if (s.remaining > 0) out.push({ cardId: card.id, payerId: card.payment_account_id, invoiceMonth: m, dueDate, remaining: s.remaining });
    }
  }
  return out.sort((a, b) => compareDates(a.dueDate, b.dueDate));
}

export function monthOverview(data: FinanceData, occurrences: readonly Occurrence[], today: IsoDate, month: Month): MonthOverview {
  const accounts = data.accounts.filter((a) => alive(a) && !a.archived);
  const banks = accounts.filter((a) => !isCard(a));
  const cards = accounts.filter(isCard);
  const cardIds = new Set(data.accounts.filter(isCard).map((a) => a.id));
  const isCurrentMonth = month === monthOf(today);
  const endDate = lastDayOf(month);
  const projection = { transactions: data.transactions, occurrences, cards: data.accounts.filter((a) => alive(a) && isCard(a)) };

  const balanceToday = banks.reduce((s, a) => s + accountBalance(a, data.transactions), 0);
  const expected =
    month < monthOf(today) ? balanceToday : banks.reduce((s, a) => s + projectBalance(a, endDate, projection), 0);

  const planned = plannedItems(data.transactions, occurrences).filter((p) => !cardIds.has(p.account_id));
  const toConfirm = isCurrentMonth ? planned.filter((p) => compareDates(p.date, today) <= 0) : [];
  const monthStart = `${month}-01`;
  const upcomingFrom = isCurrentMonth ? addDays(today, 1) : monthStart;
  const upcomingPlanned =
    month < monthOf(today) ? [] : planned.filter((p) => compareDates(p.date, upcomingFrom) >= 0 && compareDates(p.date, endDate) <= 0);
  const dues = month < monthOf(today) ? [] : invoiceDues(data, occurrences, today, upcomingFrom, endDate);
  const upcoming = [...upcomingPlanned, ...dues].sort((a, b) => {
    const da = isInvoiceDue(a) ? a.dueDate : a.date;
    const db = isInvoiceDue(b) ? b.dueDate : b.date;
    return compareDates(da, db);
  });

  const cardsOverview = cards.map((card) => {
    const invoiceMonth = invoiceToShow(card, month, today, data.transactions, occurrences);
    return { card, invoiceMonth, summary: invoiceSummary(card, invoiceMonth, data.transactions, today, occurrences) };
  });

  const summary = monthSummary(month, { transactions: data.transactions, occurrences, accounts: data.accounts });
  const budgets = data.categories
    .filter((c) => alive(c) && !c.archived && c.kind === 'expense')
    .map((category) => {
      const b = summary.byCategory.get(category.id) ?? { confirmed: 0, planned: 0 };
      return { category, spent: b.confirmed, planned: b.planned, budget: budgetFor(category.id, month, data.budgets) };
    });

  const recent = data.transactions
    .filter((t) => alive(t) && t.status === 'confirmed' && monthOf(t.date) === month)
    .sort((a, b) => compareDates(b.date, a.date) || (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 6);

  return { month, isCurrentMonth, endDate, balanceToday, expected, toConfirm, upcoming, cards: cardsOverview, budgets, recent };
}

// ---------- Fatura ----------

export interface InvoiceDetail {
  summary: InvoiceSummary;
  /** Compras e estornos da fatura (mais recentes primeiro). */
  items: Transaction[];
  /** Previstos do cartão que caem nesta fatura. */
  planned: PlannedItem[];
  payments: Transaction[];
  /** Total com os previstos ainda não lançados. */
  projected: number;
}

export function invoiceDetail(card: Account, month: Month, data: FinanceData, occurrences: readonly Occurrence[], today: IsoDate): InvoiceDetail {
  const cycle = cycleOf(card);
  const rows = data.transactions.filter((t) => alive(t) && t.invoice_month === month);
  const items = rows
    .filter((t) => t.account_id === card.id && t.type !== 'transfer' && t.status !== 'skipped' && t.status !== 'planned')
    .sort((a, b) => compareDates(b.date, a.date));
  const planned = plannedItems(rows, occurrences.filter((o) => o.account_id === card.id && invoiceMonthFor(o.date, cycle) === month)).filter(
    (p) => p.account_id === card.id,
  );
  const payments = rows.filter((t) => t.type === 'transfer' && t.to_account_id === card.id && t.status === 'confirmed');
  const summary = invoiceSummary(card, month, data.transactions, today, occurrences);
  const confirmedTotal = items.reduce((s, t) => s + (t.type === 'expense' ? t.amount_cents : -t.amount_cents), 0);
  const plannedTotal = planned.reduce((s, p) => s + (p.type === 'expense' ? p.amount_cents : -p.amount_cents), 0);
  return { summary: { ...summary }, items, planned, payments, projected: confirmedTotal + plannedTotal };
}

// ---------- Extrato ----------

export interface StatementEntry {
  key: string;
  date: IsoDate;
  description: string;
  category_id: string | null;
  type: TxType;
  /** Efeito na conta: positivo entra, negativo sai. */
  amount: number;
  planned: boolean;
  late: boolean;
  /** Previsto de hoje, esperando confirmação. */
  today: boolean;
  recurring: boolean;
  /** Fatura de cartão a vencer (pagamento previsto). */
  invoiceCardId: string | null;
}

export interface StatementDay {
  date: IsoDate;
  /** Saldo ao fim do dia: real no passado e hoje, previsto no futuro. */
  balance: number;
  projected: boolean;
  entries: StatementEntry[];
}

export interface Statement {
  balance: number;
  projected: number;
  days: StatementDay[];
}

function effect(accountId: string, m: { type: TxType; account_id: string; to_account_id: string | null; amount_cents: number }): number {
  if (m.type === 'transfer') return m.account_id === accountId ? -m.amount_cents : m.to_account_id === accountId ? m.amount_cents : 0;
  if (m.account_id !== accountId) return 0;
  return m.type === 'income' ? m.amount_cents : -m.amount_cents;
}

/** Extrato de uma conta (não cartão) até `until`: realizados e previstos, dias do mais novo ao mais antigo. */
export function statement(account: Account, data: FinanceData, occurrences: readonly Occurrence[], today: IsoDate, until: IsoDate): Statement {
  if (isCard(account)) throw new RangeError('Extrato é de conta, não de cartão');
  const involves = (m: { account_id: string; to_account_id: string | null }) => m.account_id === account.id || m.to_account_id === account.id;
  const confirmed: StatementEntry[] = data.transactions
    .filter((t) => alive(t) && t.status === 'confirmed' && involves(t))
    .map((t) => ({
      key: t.id,
      date: t.date,
      description: t.description,
      category_id: t.category_id,
      type: t.type,
      amount: effect(account.id, t),
      planned: false,
      late: false,
      today: false,
      recurring: t.recurrence_id !== null,
      invoiceCardId: null,
    }));
  const planned: StatementEntry[] = plannedItems(data.transactions, occurrences)
    .filter((p) => involves(p) && compareDates(p.date, until) <= 0)
    .map((p) => ({
      key: p.key,
      date: p.date,
      description: p.description,
      category_id: p.category_id,
      type: p.type,
      amount: effect(account.id, p),
      planned: true,
      late: compareDates(p.date, today) < 0,
      today: p.date === today,
      recurring: p.recurrenceId !== null,
      invoiceCardId: null,
    }));
  const dues: StatementEntry[] = invoiceDues(data, occurrences, today, today, until)
    .filter((d) => d.payerId === account.id)
    .map((d) => ({
      key: `${d.cardId}|${d.invoiceMonth}`,
      date: d.dueDate,
      description: '',
      category_id: null,
      type: 'transfer' as const,
      amount: -d.remaining,
      planned: true,
      late: false,
      today: d.dueDate === today,
      recurring: false,
      invoiceCardId: d.cardId,
    }));
  const balance = accountBalance(account, data.transactions);
  const all = [...confirmed, ...planned, ...dues];
  const dates = [...new Set(all.map((e) => e.date))].sort().reverse();
  const days = dates.map((date) => {
    const future = compareDates(date, today) > 0;
    const value = future
      ? balance + all.filter((e) => e.planned && compareDates(e.date, date) <= 0).reduce((s, e) => s + e.amount, 0)
      : balance - confirmed.filter((e) => compareDates(e.date, date) > 0).reduce((s, e) => s + e.amount, 0);
    return { date, balance: value, projected: future, entries: all.filter((e) => e.date === date) };
  });
  const projected = balance + [...planned, ...dues].reduce((s, e) => s + e.amount, 0);
  return { balance, projected, days };
}

// ---------- Recorrências ----------

export interface RuleNext {
  date: IsoDate;
  late: boolean;
}

/** Próxima ocorrência pendente da regra (a mais antiga ainda prevista; atrasada se já passou, exceto no cartão). */
export function nextOccurrenceOf(rule: Recurrence, occurrences: readonly Occurrence[], today: IsoDate, onCard: boolean): RuleNext | null {
  const pending = occurrences
    .filter((o) => o.recurrence_id === rule.id && o.status === 'planned')
    .filter((o) => !onCard || compareDates(o.date, today) >= 0)
    .sort((a, b) => compareDates(a.date, b.date));
  const first = pending[0];
  return first ? { date: first.date, late: compareDates(first.date, today) < 0 } : null;
}

/** As próximas `count` datas da regra a partir de `from`, sem passar do fim. */
export function upcomingDates(rule: Pick<Recurrence, 'frequency' | 'interval_count' | 'start_date' | 'end_date'>, from: IsoDate, count: number): IsoDate[] {
  const out: IsoDate[] = [];
  const day = Number(rule.start_date.slice(8, 10));
  for (let n = 0; out.length < count && n < 10_000; n++) {
    const step = n * rule.interval_count;
    const date =
      rule.frequency === 'weekly'
        ? addDays(rule.start_date, 7 * step)
        : dateInMonth(addMonths(monthOf(rule.start_date), rule.frequency === 'monthly' ? step : 12 * step), day);
    if (rule.end_date !== null && compareDates(date, rule.end_date) > 0) break;
    if (compareDates(date, from) >= 0) out.push(date);
  }
  return out;
}
