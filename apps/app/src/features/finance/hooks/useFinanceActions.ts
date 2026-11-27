// Ações das telas de Finanças: cada uma chama os repositórios (as regras ficam no domain) e devolve, quando faz
// sentido, como desfazer. Nenhuma tela grava direto no banco.
import {
  currentInvoiceMonth,
  cycleOf,
  materializeOccurrence,
  paidByOther,
  planBudgetChange,
  planInstallmentPurchase,
  planOngoingInstallments,
  planPreviousBalance,
  suggestInvoiceToPay,
  type Account,
  type AccountPatch,
  type Category,
  type CategoryColor,
  type CategoryKind,
  type Frequency,
  type IsoDate,
  type Month,
  type PlannedItem,
  type Recurrence,
  type RecurrenceDraft,
  type Transaction,
  type TxStatus,
  type TxType,
} from '@glife/domain/finance';
import { useMemo } from 'react';

import { UserFacingError } from '@/shared/lib/errorText';

import { useFinance } from './FinanceData';
import { settlePlanned, type Undo } from './settlePlanned';

export interface EntryForm {
  type: TxType;
  cents: number;
  description: string;
  categoryId: string | null;
  accountId: string;
  toAccountId: string | null;
  installments: number;
  date: IsoDate;
  planned: boolean;
  repeat: {
    frequency: Frequency;
    interval: number;
    endDate: IsoDate | null;
  } | null;
}

export interface CardForm {
  name: string;
  closingDay: number;
  dueDay: number;
  limitCents: number | null;
  payerId: string;
  existing: {
    openCents: number;
    parcels: {
      description: string;
      cents: number;
      index: number;
      count: number;
    }[];
  } | null;
}

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: CategoryColor;
  /** orçamento mensal (só despesa); 0 tira o orçamento */
  budgetCents: number;
}


export interface CreatedEntry {
  txIds: string[];
  recurrenceId: string | null;
}
export function useFinanceActions() {
  const { repos, data, refresh } = useFinance();

  return useMemo(() => {
    const accountOf = (id: string): Account => {
      const a = data?.accounts.find((x) => x.id === id);
      if (!a) throw new UserFacingError('Conta não encontrada.');
      return a;
    };

    /**
     * Confirma ou pula um previsto (linha gravada ou ocorrência calculada). `paidBy` (só ao confirmar um gasto):
     * outra pessoa pagou; grava junto a entrada que compensa, e o saldo da conta não muda. Tudo ou nada.
     */
    async function settle(
      item: PlannedItem,
      status: 'confirmed' | 'skipped',
      changes: { amount_cents?: number; date?: IsoDate } = {},
      paidBy?: { who: string | null },
    ): Promise<Undo> {
      const undoSettle = await settleOnly(item, status, changes);
      if (!paidBy || status !== 'confirmed') return undoSettle;
      let income: Transaction;
      try {
        const [draft] = paidByOther({
          accountId: item.account_id,
          cents: changes.amount_cents ?? item.amount_cents,
          date: changes.date ?? item.date,
          who: paidBy.who,
          label: item.description || undefined,
        });
        income = await repos.transactions.create(draft!);
      } catch (e) {
        await undoSettle().catch(() => undefined);
        throw e;
      }
      return async () => {
        await repos.transactions.remove(income.id);
        await undoSettle();
      };
    }

    async function settleOnly(
      item: PlannedItem,
      status: 'confirmed' | 'skipped',
      changes: { amount_cents?: number; date?: IsoDate },
    ): Promise<Undo> {
      return settlePlanned(repos, data, item, status, changes);
    }

    function invoiceToPay(cardId: string, date: IsoDate): Month {
      const card = accountOf(cardId);
      return suggestInvoiceToPay(card, data?.transactions ?? [], date) ?? currentInvoiceMonth(date, cycleOf(card));
    }

    /** Grava o lançamento e diz o que criou (lançamentos e regra), para quem precisa desfazer. */
    async function createEntry(f: EntryForm): Promise<CreatedEntry> {
      const account = accountOf(f.accountId);
      const category = f.categoryId ? data?.categories.find((c) => c.id === f.categoryId) : null;
      const description = f.description.trim() || category?.name || (f.type === 'transfer' ? 'Transferência' : '');
      const status: 'planned' | 'confirmed' = f.planned ? 'planned' : 'confirmed';
      const categoryId = f.type === 'transfer' ? null : f.categoryId;
      const toAccountId = f.type === 'transfer' ? f.toAccountId : null;

      if (f.repeat) {
        const draft: RecurrenceDraft = {
          type: f.type,
          amount_cents: f.cents,
          account_id: f.accountId,
          to_account_id: toAccountId,
          category_id: categoryId,
          description,
          frequency: f.repeat.frequency,
          interval_count: f.repeat.interval,
          start_date: f.date,
          end_date: f.repeat.endDate,
        };
        const rule = await repos.recurrences.create(draft);
        // Sem "É previsto", a primeira ocorrência (hoje) já aconteceu.
        const txIds: string[] = [];
        if (!f.planned) {
          txIds.push((await repos.transactions.upsertOccurrence(materializeOccurrence(rule, f.date, { status: 'confirmed' }, account))).id);
        }
        await refresh();
        return { txIds, recurrenceId: rule.id };
      }

      if (account.kind === 'credit_card' && f.type === 'expense') {
        const rows = planInstallmentPurchase({
          card: account,
          description,
          category_id: categoryId,
          totalCents: f.cents,
          count: f.installments,
          date: f.date,
        }).map((r) => ({ ...r, status }));
        const created = await repos.transactions.createMany(rows);
        return { txIds: created.map((x) => x.id), recurrenceId: null };
      }

      const target = toAccountId ? accountOf(toAccountId) : null;
      const tx = await repos.transactions.create({
        type: f.type,
        status,
        amount_cents: f.cents,
        date: f.date,
        account_id: f.accountId,
        to_account_id: toAccountId,
        category_id: categoryId,
        description,
        invoice_month: target?.kind === 'credit_card' ? invoiceToPay(target.id, f.date) : null,
      });
      return { txIds: [tx.id], recurrenceId: null };
    }

    /** Paga a fatura saindo de `fromId`; com `paidBy`, outra pessoa pagou (entrada + pagamento juntos, saldo igual). */
    async function payInvoice(p: { cardId: string; month: Month; cents: number; fromId: string; date: IsoDate; paidBy?: { who: string | null } }) {
      const card = accountOf(p.cardId);
      if (p.paidBy) {
        await repos.transactions.createMany(
          paidByOther({
            accountId: p.fromId,
            cents: p.cents,
            date: p.date,
            who: p.paidBy.who,
            invoice: { cardId: p.cardId, month: p.month, description: `Pagamento da fatura ${card.name}` },
          }),
        );
        return;
      }
      await repos.transactions.create({
        type: 'transfer',
        amount_cents: p.cents,
        date: p.date,
        account_id: p.fromId,
        to_account_id: p.cardId,
        invoice_month: p.month,
        description: `Pagamento da fatura ${card.name}`,
      });
    }

    async function createAccount(a: { kind: 'checking' | 'savings' | 'cash'; name: string; initialCents: number }) {
      const created = await repos.accounts.create({
        kind: a.kind,
        name: a.name.trim(),
        initial_balance_cents: a.initialCents,
      });
      await refresh();
      return created;
    }

    async function createCard(f: CardForm, today: IsoDate) {
      const card = await repos.accounts.create({
        kind: 'credit_card',
        name: f.name.trim(),
        closing_day: f.closingDay,
        due_day: f.dueDay,
        credit_limit_cents: f.limitCents,
        payment_account_id: f.payerId,
      });
      if (f.existing) {
        try {
          await addExisting(card, f.existing, today);
        } catch (e) {
          // Tudo ou nada: sem o histórico, o cartão também não fica (senão uma nova tentativa duplicaria).
          await repos.accounts.remove(card.id).catch(() => undefined);
          throw e;
        }
      }
      await refresh();
      return card;
    }

    /** Fatura em aberto ("Saldo anterior") e parcelamentos em andamento de um cartão já em uso. */
    async function addExisting(card: Account, existing: NonNullable<CardForm['existing']>, today: IsoDate) {
      const rows = [
        ...(existing.openCents > 0 ? [planPreviousBalance({ card, amountCents: existing.openCents, today })] : []),
        ...existing.parcels.flatMap((p) =>
          planOngoingInstallments({
            card,
            description: p.description,
            category_id: null,
            installmentCents: p.cents,
            currentIndex: p.index,
            count: p.count,
            today,
          }),
        ),
      ];
      if (rows.length > 0) await repos.transactions.createMany(rows);
    }

    async function setBudget(categoryId: string, month: Month, cents: number) {
      await repos.budgets.set(categoryId, month, cents);
      await refresh();
    }

    /** Mudança vale de `from` em diante: antes do início da regra, edita no lugar; depois, divide. */
    async function changeRule(rule: Recurrence, from: IsoDate, changes: Partial<RecurrenceDraft>) {
      if (from <= rule.start_date) await repos.recurrences.update(rule.id, changes);
      else await repos.recurrences.split(rule.id, from, changes);
      await refresh();
    }

    async function endRule(rule: Recurrence, endDate: IsoDate) {
      await repos.recurrences.end(rule.id, endDate);
      await refresh();
    }

    /**
     * Exclui lançamentos (uma parcela ou a compra inteira) e devolve como desfazer. Ocorrência de recorrência não é
     * apagada: vira "pulada", senão a regra a recalcularia e ela voltaria como prevista (sem como excluir).
     */
    async function deleteTransactions(ids: readonly string[]): Promise<Undo> {
      const byId = new Map((data?.transactions ?? []).map((t) => [t.id, t]));
      const occurrences = ids.filter((id) => {
        const t = byId.get(id);
        return !!t?.recurrence_id && !!t.occurrence_date;
      });
      const plain = ids.filter((id) => !occurrences.includes(id));
      const skipped: { id: string; status: TxStatus }[] = [];
      try {
        for (const id of occurrences) {
          const status = byId.get(id)!.status;
          await repos.transactions.skip(id);
          skipped.push({ id, status });
        }
        if (plain.length > 0) await repos.transactions.removeMany(plain);
      } catch (e) {
        // Tudo ou nada: volta as ocorrências já puladas.
        for (const { id, status } of skipped) await repos.transactions.update(id, { status }).catch(() => undefined);
        throw e;
      }
      return async () => {
        if (plain.length > 0) await repos.transactions.restoreMany(plain);
        for (const { id, status } of skipped) await repos.transactions.update(id, { status });
      };
    }

    const removalImpact = (accountId: string) => repos.accounts.removalImpact(accountId);

    /** Exclui a conta ou o cartão com os lançamentos e as recorrências dele. */
    async function deleteAccount(accountId: string) {
      await repos.accounts.remove(accountId);
      await refresh();
    }

    // ---------- Categorias ----------

    /**
     * Grava a categoria e o orçamento a partir de `month`, tudo ou nada. Nova: categoria e orçamento numa transação
     * só (`createWithBudget`). Edição: se o orçamento falhar, a categoria volta como estava. Gasto que vira receita
     * encerra o orçamento neste mês (antes de trocar o tipo, enquanto ainda é gasto); os meses passados ficam.
     */
    async function saveCategory(id: string | null, input: CategoryInput, month: Month): Promise<Category> {
      const fields = { name: input.name, kind: input.kind, icon: input.icon, color: input.color };
      if (!id) {
        const sameKind = (data?.categories ?? []).filter((c) => c.kind === input.kind);
        const last = sameKind.reduce((max, c) => Math.max(max, c.sort_order), -1);
        const budget = input.kind === 'expense' && input.budgetCents > 0 ? { month, amount_cents: input.budgetCents } : null;
        const created = await repos.categories.createWithBudget({ ...fields, sort_order: last + 1 }, budget);
        await refresh();
        return created;
      }

      const before = data?.categories.find((c) => c.id === id);
      if (!before) throw new UserFacingError('Categoria não encontrada.');
      const restore = { name: before.name, kind: before.kind, icon: before.icon, color: before.color };
      const endsBudget = before.kind === 'expense' && input.kind !== 'expense';
      let undoEnd: Undo | null = null;
      try {
        if (endsBudget) undoEnd = await applyBudget(id, month, 0);
        const saved = await repos.categories.update(id, fields);
        if (saved.kind === 'expense') {
          try {
            await applyBudget(id, month, input.budgetCents);
          } catch (e) {
            await repos.categories.update(id, restore).catch(() => undefined);
            throw e;
          }
        }
        await refresh();
        return saved;
      } catch (e) {
        if (undoEnd) await undoEnd();
        await refresh();
        throw e;
      }
    }

    /**
     * Aplica `planBudgetChange` (orçamento de `month` em diante; meses passados intactos). Se uma parte falhar,
     * desfaz o que já gravou. Devolve como desfazer tudo.
     */
    async function applyBudget(categoryId: string, month: Month, cents: number): Promise<Undo> {
      const budgets = data?.budgets ?? [];
      const plan = planBudgetChange(categoryId, month, cents, budgets);
      const atMonth = budgets.find((b) => b.deleted_at === null && b.category_id === categoryId && b.starts_month === month) ?? null;
      const done: Undo[] = [];
      const undoAll = async () => {
        for (const undo of [...done].reverse()) await undo().catch(() => undefined);
      };
      try {
        for (const b of plan.remove) {
          await repos.budgets.remove(b.id);
          done.push(async () => {
            await repos.budgets.set(b.category_id, b.starts_month, b.amount_cents);
          });
        }
        if (plan.set !== null) {
          const row = await repos.budgets.set(categoryId, month, plan.set);
          done.push(async () => {
            if (atMonth) await repos.budgets.set(categoryId, month, atMonth.amount_cents);
            else await repos.budgets.remove(row.id);
          });
        }
      } catch (e) {
        await undoAll();
        throw e;
      }
      return undoAll;
    }

    async function archiveCategory(id: string): Promise<Undo> {
      await repos.categories.archive(id);
      await refresh();
      return async () => {
        await repos.categories.unarchive(id);
        await refresh();
      };
    }

    async function unarchiveCategory(id: string) {
      await repos.categories.unarchive(id);
      await refresh();
    }

    async function reorderCategories(ids: readonly string[]) {
      await repos.categories.reorder(ids);
      await refresh();
    }

    // ---------- Contas ----------

    async function updateAccount(id: string, patch: AccountPatch) {
      const a = await repos.accounts.update(id, patch);
      await refresh();
      return a;
    }

    async function archiveAccount(id: string): Promise<Undo> {
      await repos.accounts.archive(id);
      await refresh();
      return async () => {
        await repos.accounts.unarchive(id);
        await refresh();
      };
    }

    async function unarchiveAccount(id: string) {
      await repos.accounts.unarchive(id);
      await refresh();
    }

    async function reorderAccounts(ids: readonly string[]) {
      await repos.accounts.reorder(ids);
      await refresh();
    }

    /** Leva o saldo ao do banco; `null` = nada a ajustar. O desfazer exclui o lançamento de ajuste. */
    async function adjustBalance(accountId: string, bankCents: number, date: IsoDate): Promise<Undo | null> {
      const tx = await repos.transactions.adjustBalance(accountId, bankCents, date);
      if (!tx) return null;
      return async () => {
        await repos.transactions.remove(tx.id);
      };
    }

    /** Desfaz `createEntry` de um lançamento sem repetição (os lançamentos criados agora). */
    async function discardEntry(c: CreatedEntry) {
      if (c.recurrenceId) throw new Error('Regra recorrente não se desfaz por aqui');
      if (c.txIds.length) await repos.transactions.removeMany(c.txIds);
      await refresh();
    }

    return {
      discardEntry,
      saveCategory,
      archiveCategory,
      unarchiveCategory,
      reorderCategories,
      updateAccount,
      archiveAccount,
      unarchiveAccount,
      reorderAccounts,
      adjustBalance,
      deleteTransactions,
      removalImpact,
      deleteAccount,
      settle,
      createEntry,
      payInvoice,
      createAccount,
      createCard,
      setBudget,
      changeRule,
      endRule,
      invoiceToPay,
    };
  }, [repos, data, refresh]);
}
