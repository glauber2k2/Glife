// Recorrências: a regra fica gravada; as ocorrências são calculadas na hora. Só vira linha o mês que foi confirmado,
// pulado ou editado, com id determinístico (regra + data): dois aparelhos offline gravam o mesmo id, sem duplicata.
import { sha1 } from '@noble/hashes/legacy.js';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

import { addDays, addMonths, compareDates, dateInMonth, localDateOf, monthOf, type IsoDate } from './calendar.ts';
import { invoiceMonthFor } from './invoice.ts';
import type { PlannedTransaction } from './installments.ts';
import type { Account, Recurrence, RecurrenceDraft, Transaction, TxStatus } from './model.ts';

/** Namespace fixo do UUID v5 das ocorrências (nunca mudar: mudaria os ids já gravados). */
export const FINANCE_OCCURRENCE_NAMESPACE = '6f1d2c3e-8a4b-5c6d-9e7f-0a1b2c3d4e5f';

/** Namespace fixo do UUID v5 dos orçamentos (um por categoria e mês). Nunca mudar. */
export const FINANCE_BUDGET_NAMESPACE = '0b7e4a52-3c1d-5e8f-a9b0-c1d2e3f4a5b6';

/** UUID v5 (RFC 9562) de `recurrenceId|date` no namespace das ocorrências. */
export function occurrenceId(recurrenceId: string, date: IsoDate): string {
  return uuidV5(FINANCE_OCCURRENCE_NAMESPACE, `${recurrenceId}|${date}`);
}

/** Id fixo do orçamento de uma categoria num mês: dois aparelhos offline gravam a mesma linha. */
export function budgetId(categoryId: string, startsMonth: string): string {
  return uuidV5(FINANCE_BUDGET_NAMESPACE, `${categoryId}|${startsMonth}`);
}

function uuidV5(namespace: string, value: string): string {
  const ns = hexToBytes(namespace.replaceAll('-', ''));
  const name = utf8ToBytes(value);
  const input = new Uint8Array(ns.length + name.length);
  input.set(ns);
  input.set(name, ns.length);
  const bytes = sha1(input).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type Occurrence = Pick<Recurrence, 'type' | 'account_id' | 'to_account_id' | 'category_id' | 'description'> & {
  id: string;
  recurrence_id: string;
  /** Data original da ocorrência na regra (chave da linha gravada). */
  occurrence_date: IsoDate;
  /** Data efetiva: a da linha gravada, se houver; senão a original. */
  date: IsoDate;
  amount_cents: number;
  status: TxStatus;
  materialized: Transaction | null;
};

/** n-ésima data da regra (sem cortar pelo início efetivo nem pelo fim). */
function nthDate(rule: Recurrence, n: number): IsoDate {
  const step = n * rule.interval_count;
  const day = Number(rule.start_date.slice(8, 10));
  if (rule.frequency === 'weekly') return addDays(rule.start_date, 7 * step);
  const months = rule.frequency === 'monthly' ? step : 12 * step;
  return dateInMonth(addMonths(monthOf(rule.start_date), months), day);
}

/**
 * Ocorrências da regra entre `from` e `to` (inclusive), a partir do cadastro da regra (sem passado fantasma).
 * `materialized` deve vir de `transactions.listForRecurrences` (pela regra, não pelo período): uma ocorrência
 * confirmada com outra data pode estar fora do período.
 */
export function expandRecurrence(
  rule: Recurrence,
  from: IsoDate,
  to: IsoDate,
  materialized: readonly Transaction[],
): Occurrence[] {
  // Sem passado fantasma: conta a partir do cadastro; cadastro ilegível cai no início da regra.
  const createdOn = localDateOf(rule.created_at) ?? rule.start_date;
  const start = [rule.start_date, createdOn, from].sort().at(-1)!;
  const end = rule.end_date !== null && compareDates(rule.end_date, to) < 0 ? rule.end_date : to;
  const rows = new Map(
    materialized
      .filter((t) => t.recurrence_id === rule.id && t.deleted_at === null && t.occurrence_date !== null)
      .map((t) => [t.occurrence_date!, t]),
  );
  const out: Occurrence[] = [];
  for (let n = 0; ; n++) {
    const date = nthDate(rule, n);
    if (compareDates(date, end) > 0) break;
    if (compareDates(date, start) < 0) continue;
    const row = rows.get(date) ?? null;
    out.push({
      id: occurrenceId(rule.id, date),
      recurrence_id: rule.id,
      occurrence_date: date,
      type: row?.type ?? rule.type,
      account_id: row?.account_id ?? rule.account_id,
      to_account_id: row ? row.to_account_id : rule.to_account_id,
      category_id: row ? row.category_id : rule.category_id,
      description: row?.description ?? rule.description,
      date: row?.date ?? date,
      amount_cents: row?.amount_cents ?? rule.amount_cents,
      status: row?.status ?? 'planned',
      materialized: row,
    });
  }
  return out;
}

/** Linha que grava a ocorrência `date` (confirmar, pular ou editar). `account` é a conta da regra. */
export function materializeOccurrence(
  rule: Recurrence,
  date: IsoDate,
  changes: { status: TxStatus; amount_cents?: number; date?: IsoDate },
  account: Account,
): PlannedTransaction {
  const effective = changes.date ?? date;
  const isCard = account.kind === 'credit_card' && account.closing_day !== null && account.due_day !== null;
  return {
    id: occurrenceId(rule.id, date),
    type: rule.type,
    status: changes.status,
    amount_cents: changes.amount_cents ?? rule.amount_cents,
    date: effective,
    account_id: rule.account_id,
    to_account_id: rule.to_account_id,
    category_id: rule.category_id,
    description: rule.description,
    invoice_month: isCard
      ? invoiceMonthFor(effective, { closing_day: account.closing_day!, due_day: account.due_day! })
      : null,
    installment_of: null,
    installment_index: null,
    installment_count: null,
    recurrence_id: rule.id,
    occurrence_date: date,
  };
}

/** "Este e os próximos": encerra a regra na véspera de `from` e devolve a regra nova a partir de `from`. */
export function splitRecurrence(
  rule: Recurrence,
  from: IsoDate,
  changes: Partial<RecurrenceDraft>,
): { endedPatch: { end_date: IsoDate }; next: RecurrenceDraft } {
  if (compareDates(from, rule.start_date) <= 0) throw new RangeError('Dividir só depois do início; antes disso, edite a regra');
  const { id: _i, user_id: _u, created_at: _c, updated_at: _up, deleted_at: _d, ...mold } = rule;
  return { endedPatch: { end_date: addDays(from, -1) }, next: { ...mold, ...changes, start_date: from } };
}
