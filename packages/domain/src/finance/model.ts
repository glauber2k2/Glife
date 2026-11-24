// Finanças: contas (inclusive cartão com fatura), categorias, transações, recorrências e orçamentos.
// Espelha as tabelas da migração de finanças; as regras entre campos (superRefine) repetem os `check` do banco.
import { z } from 'zod';

import { baseEntitySchema, parseOrThrow, stampNew, stampUpdate, type BaseEntity } from '../core/index.ts';
import { isoDateSchema, monthSchema } from './calendar.ts';
import { INSTALLMENTS_MAX, centsSchema } from './money.ts';

export const ACCOUNT_KINDS = ['checking', 'savings', 'cash', 'credit_card'] as const;
export const CATEGORY_KINDS = ['expense', 'income'] as const;
export const TX_TYPES = ['expense', 'income', 'transfer'] as const;
export const TX_STATUSES = ['planned', 'confirmed', 'skipped'] as const;
export const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
/** Chaves da paleta de categorias (as cores ficam nos tokens do app, nunca hex no banco). */
export const CATEGORY_COLORS = ['slate', 'steel', 'sage', 'sand', 'clay', 'rose', 'plum', 'teal'] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];
export type CategoryKind = (typeof CATEGORY_KINDS)[number];
export type TxType = (typeof TX_TYPES)[number];
export type TxStatus = (typeof TX_STATUSES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const ACCOUNT_NAME_MAX = 80;
export const CATEGORY_NAME_MAX = 60;
export const TX_DESCRIPTION_MAX = 200;
export const INTERVAL_MAX = 99;

const singleLine = (max: number) =>
  z.string().trim().max(max).refine((s) => !/[\r\n]/.test(s), 'Uma linha só.');
const positiveCents = centsSchema.refine((v) => v > 0, 'Valor deve ser maior que zero');
const day = z.number().int().min(1).max(31);
const issue = (ctx: z.RefinementCtx, message: string) => ctx.addIssue({ code: 'custom', message });

/** Aplica padrões, valida e carimba id, dono e datas. */
function build<T extends object>(schema: z.ZodType<T>, defaults: Partial<T>, draft: object, userId: string, clock?: () => Date) {
  const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined));
  return stampNew(parseOrThrow(schema, { ...defaults, ...clean }), userId, clock);
}

/** Junta o patch (só campos definidos) e revalida a entidade inteira. */
function patch<E extends BaseEntity, T extends object>(schema: z.ZodType<T>, entity: E, changes: object, clock?: () => Date): E {
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  const { id: _i, user_id: _u, created_at: _c, updated_at: _up, deleted_at: _d, ...current } = entity;
  const merged = parseOrThrow(schema, { ...current, ...clean });
  return stampUpdate(entity, merged as unknown as Partial<E>, clock);
}

// ---------- Contas ----------

const accountFields = z.object({
  name: singleLine(ACCOUNT_NAME_MAX).min(1),
  kind: z.enum(ACCOUNT_KINDS),
  initial_balance_cents: centsSchema,
  archived: z.boolean(),
  closing_day: day.nullable(),
  due_day: day.nullable(),
  credit_limit_cents: centsSchema.refine((v) => v >= 0).nullable(),
  payment_account_id: z.uuid().nullable(),
});

const accountData = accountFields.superRefine((a, ctx) => {
  if (a.kind === 'credit_card') {
    if (a.closing_day === null || a.due_day === null) issue(ctx, 'Cartão precisa de fechamento e vencimento');
    if (a.payment_account_id === null) issue(ctx, 'Cartão precisa da conta que paga a fatura');
    if (a.initial_balance_cents !== 0) issue(ctx, 'Cartão não tem saldo inicial');
  } else if (a.closing_day !== null || a.due_day !== null || a.credit_limit_cents !== null || a.payment_account_id !== null) {
    issue(ctx, 'Só cartão tem fechamento, vencimento, limite e conta pagadora');
  }
});

export const accountSchema = baseEntitySchema.extend(accountFields.shape);
export type Account = z.infer<typeof accountSchema>;
export type AccountDraft = Partial<z.input<typeof accountFields>> & Pick<z.input<typeof accountFields>, 'name' | 'kind'>;
export type AccountPatch = Partial<z.input<typeof accountFields>>;

const ACCOUNT_DEFAULTS = {
  initial_balance_cents: 0,
  archived: false,
  closing_day: null,
  due_day: null,
  credit_limit_cents: null,
  payment_account_id: null,
};

export function newAccount(draft: AccountDraft, userId: string, clock?: () => Date): Account {
  return build(accountData, ACCOUNT_DEFAULTS, draft, userId, clock);
}
export function applyAccountPatch(account: Account, changes: AccountPatch, clock?: () => Date): Account {
  return patch(accountData, account, changes, clock);
}

// ---------- Categorias ----------

const categoryFields = z.object({
  name: singleLine(CATEGORY_NAME_MAX).min(1),
  kind: z.enum(CATEGORY_KINDS),
  color: z.enum(CATEGORY_COLORS),
  icon: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Ícone inválido').max(60),
  archived: z.boolean(),
});

export const categorySchema = baseEntitySchema.extend(categoryFields.shape);
export type Category = z.infer<typeof categorySchema>;
export type CategoryDraft = Omit<z.input<typeof categoryFields>, 'archived'> & { archived?: boolean };
export type CategoryPatch = Partial<z.input<typeof categoryFields>>;

export function newCategory(draft: CategoryDraft, userId: string, clock?: () => Date): Category {
  return build(categoryFields, { archived: false }, draft, userId, clock);
}
export function applyCategoryPatch(category: Category, changes: CategoryPatch, clock?: () => Date): Category {
  return patch(categoryFields, category, changes, clock);
}

// ---------- Molde comum a transação e recorrência ----------

const movementFields = {
  type: z.enum(TX_TYPES),
  amount_cents: positiveCents,
  account_id: z.uuid(),
  to_account_id: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
  description: singleLine(TX_DESCRIPTION_MAX),
};

type Movement = { type: TxType; account_id: string; to_account_id: string | null; category_id: string | null };

function movementRules(m: Movement, ctx: z.RefinementCtx) {
  if (m.type === 'transfer') {
    if (m.to_account_id === null) issue(ctx, 'Transferência precisa da conta de destino');
    if (m.to_account_id === m.account_id) issue(ctx, 'Origem e destino devem ser diferentes');
    if (m.category_id !== null) issue(ctx, 'Transferência não tem categoria');
  } else if (m.to_account_id !== null) {
    issue(ctx, 'Só transferência tem conta de destino');
  }
}

// ---------- Transações ----------

const transactionFields = z.object({
  ...movementFields,
  status: z.enum(TX_STATUSES),
  date: isoDateSchema,
  invoice_month: monthSchema.nullable(),
  installment_of: z.uuid().nullable(),
  installment_index: z.number().int().nullable(),
  installment_count: z.number().int().nullable(),
  recurrence_id: z.uuid().nullable(),
  occurrence_date: isoDateSchema.nullable(),
});

const transactionData = transactionFields.superRefine((t, ctx) => {
  movementRules(t, ctx);
  const parts = [t.installment_of, t.installment_index, t.installment_count];
  if (parts.some((p) => p === null) && parts.some((p) => p !== null)) {
    issue(ctx, 'Parcela precisa de grupo, número e total');
  } else if (t.installment_index !== null && t.installment_count !== null) {
    const ok = t.installment_index >= 1 && t.installment_index <= t.installment_count && t.installment_count <= INSTALLMENTS_MAX;
    if (!ok) issue(ctx, 'Número de parcela inválido');
  }
  if ((t.recurrence_id === null) !== (t.occurrence_date === null)) issue(ctx, 'Ocorrência precisa de regra e data');
});

export const transactionSchema = baseEntitySchema.extend(transactionFields.shape);
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionDraft = Partial<z.input<typeof transactionFields>> &
  Pick<z.input<typeof transactionFields>, 'type' | 'amount_cents' | 'date' | 'account_id'>;
export type TransactionPatch = Partial<z.input<typeof transactionFields>>;

const TRANSACTION_DEFAULTS = {
  status: 'confirmed' as const,
  description: '',
  to_account_id: null,
  category_id: null,
  invoice_month: null,
  installment_of: null,
  installment_index: null,
  installment_count: null,
  recurrence_id: null,
  occurrence_date: null,
};

export function newTransaction(draft: TransactionDraft, userId: string, clock?: () => Date): Transaction {
  return build(transactionData, TRANSACTION_DEFAULTS, draft, userId, clock);
}
export function applyTransactionPatch(tx: Transaction, changes: TransactionPatch, clock?: () => Date): Transaction {
  return patch(transactionData, tx, changes, clock);
}

// ---------- Recorrências ----------

const recurrenceFields = z.object({
  ...movementFields,
  frequency: z.enum(FREQUENCIES),
  interval_count: z.number().int().min(1).max(INTERVAL_MAX),
  start_date: isoDateSchema,
  end_date: isoDateSchema.nullable(),
});

const recurrenceData = recurrenceFields.superRefine((r, ctx) => {
  movementRules(r, ctx);
  if (r.end_date !== null && r.end_date < r.start_date) issue(ctx, 'Fim antes do início');
});

export const recurrenceSchema = baseEntitySchema.extend(recurrenceFields.shape);
export type Recurrence = z.infer<typeof recurrenceSchema>;
export type RecurrenceDraft = Partial<z.input<typeof recurrenceFields>> &
  Pick<z.input<typeof recurrenceFields>, 'type' | 'amount_cents' | 'account_id' | 'frequency' | 'start_date'>;
export type RecurrencePatch = Partial<z.input<typeof recurrenceFields>>;

const RECURRENCE_DEFAULTS = { interval_count: 1, end_date: null, to_account_id: null, category_id: null, description: '' };

export function newRecurrence(draft: RecurrenceDraft, userId: string, clock?: () => Date): Recurrence {
  return build(recurrenceData, RECURRENCE_DEFAULTS, draft, userId, clock);
}
export function applyRecurrencePatch(rule: Recurrence, changes: RecurrencePatch, clock?: () => Date): Recurrence {
  return patch(recurrenceData, rule, changes, clock);
}

// ---------- Orçamentos ----------

const budgetFields = z.object({
  category_id: z.uuid(),
  starts_month: monthSchema,
  amount_cents: positiveCents,
});

export const budgetSchema = baseEntitySchema.extend(budgetFields.shape);
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetDraft = z.input<typeof budgetFields>;

export function newBudget(draft: BudgetDraft, userId: string, clock?: () => Date): Budget {
  return build(budgetFields, {}, draft, userId, clock);
}

// ---------- Coerência entre tipo e categoria ----------

/**
 * Despesa pede categoria de despesa e receita pede de receita; transferência não tem categoria.
 * Exceção: receita no cartão com categoria de despesa é estorno (abate o gasto da categoria).
 */
export function checkCategoryFits(type: TxType, accountKind: AccountKind, category: Pick<Category, 'kind'> | null): boolean {
  if (category === null) return true;
  if (type === 'transfer') return false;
  if (type === 'income' && accountKind === 'credit_card') return true;
  return category.kind === type;
}
