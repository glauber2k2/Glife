# Finanças — modelo de dados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Banco, sync, regras e repositórios de finanças (contas, cartão com fatura, transações, recorrências, orçamentos, previsão), sem telas.

**Architecture:** Regras puras em `packages/domain/src/finance/` (calendário, fatura, parcelas, recorrência, saldo/previsão), testadas com vitest. Uma migração nova cria 5 tabelas no padrão `vida_apply_standard`; o app espelha no SQLite do PowerSync e implementa os repositórios em `apps/app/src/features/finance/data/`, validados pela mesma suíte de contrato da implementação em memória.

**Tech Stack:** TypeScript, Zod 4, vitest, Postgres (PGlite nos testes), PowerSync (`@powersync/common`), `@noble/hashes` (SHA-1 para UUID v5).

**Spec:** `docs/superpowers/specs/2026-11-24-financas-modelo-design.md` (ler inteiro antes de qualquer tarefa).

## Global Constraints

- Dinheiro sempre em centavos inteiros; `amount_cents > 0`, o sentido vem do `type`. Reusar `money.ts` (`centsSchema`, `splitInstallments`, `sumCents`, `INSTALLMENTS_MAX = 120`).
- Datas de calendário `YYYY-MM-DD` (texto, sem fuso); mês `YYYY-MM`. Dia 29–31 inexistente → último dia do mês.
- Domain: sem React/RN/Expo/Supabase/PowerSync; imports relativos com `.ts`; quem chama nunca informa `user_id`; erros só `RepositoryError`.
- Toda tabela: `id, user_id, created_at, updated_at, deleted_at`, `select public.vida_apply_standard(...)`, FK composta `(x_id, user_id)`, `alter publication powersync add table`, query no `sync-streams.yaml` com `auth.user_id()` + `aal2`.
- Migração nova; nunca editar as três existentes. Sem hex: `categories.color` é chave de paleta.
- Commits `feat(financas): …`/`test(financas): …`, e-mail noreply, sem co-autoria; antes de cada commit `pnpm lint && pnpm typecheck && pnpm test` na raiz `glife/`.
- Só `git add` dos arquivos da tarefa (pode haver alterações de outras sessões no working tree).

## Review Focus

1. Compra **no dia do fechamento** vai para a fatura seguinte (não a atual) — testado na Task 1.
2. Cartão com fechamento 31 em fevereiro/meses de 30 dias e vencimento antes do fechamento (fecha 25, vence 5) — Task 1.
3. Duas gravações da mesma ocorrência (dois aparelhos) resultam em **uma** linha — Task 4 (id determinístico) e Task 6 (contrato: `upsertOccurrence` duas vezes → 1 linha).
4. Compra no cartão + pagamento da fatura não somam duas vezes no orçamento nem na projeção da conta pagadora — Task 5.
5. Parcelamento em andamento "4 de 10" cria exatamente 7 linhas, a primeira na fatura atual — Task 3.

---

### Task 1: Calendário e fatura

**Files:**
- Create: `packages/domain/src/finance/calendar.ts`, `packages/domain/src/finance/invoice.ts`
- Modify: `packages/domain/src/finance/index.ts` (exportar tudo)
- Test: `packages/domain/src/finance/__tests__/invoice.test.ts`

**Interfaces:**
- Produces: `type IsoDate = string` (`YYYY-MM-DD`), `type Month = string` (`YYYY-MM`), `isoDateSchema`, `monthSchema`, `monthOf(date: IsoDate): Month`, `addMonths(month: Month, n: number): Month`, `dateInMonth(month: Month, day: number): IsoDate` (limita ao último dia), `addDays(date: IsoDate, n: number): IsoDate`, `compareDates(a, b): number`; `invoiceMonthFor(purchase: IsoDate, card: CardCycle): Month`, `invoiceDates(invoiceMonth: Month, card: CardCycle): { closingDate: IsoDate; dueDate: IsoDate }`, `type CardCycle = { closing_day: number; due_day: number }`.

- [ ] **Step 1: Testes que falham** (fecha 3, vence 10 = `A`; fecha 25, vence 5 = `B`; fecha 31, vence 10 = `C`)
  - `invoiceMonthFor('2026-11-28', A) === '2026-12'`; `('2026-12-02', A) === '2026-12'`; `('2026-12-03', A) === '2027-01'` (dia do fechamento → seguinte).
  - `invoiceMonthFor('2026-11-20', B) === '2026-12'`; `('2026-11-25', B) === '2027-01'`.
  - `invoiceMonthFor('2027-02-27', C) === '2027-03'` (fecha 28/02); `('2027-02-28', C) === '2027-04'` (fecha 31/03, vence 10/04).
  - `invoiceDates('2026-12', A)` → `{ closingDate: '2026-12-03', dueDate: '2026-12-10' }`; `invoiceDates('2027-01', B)` → `{ '2026-12-25', '2027-01-05' }`.
  - Propriedade: para 60 datas seguidas a partir de `2026-11-01` e cada cartão A/B/C, `invoiceDates(invoiceMonthFor(d)).closingDate > d` e o `closingDate` da fatura anterior `<= d`.
  - `dateInMonth('2027-02', 31) === '2027-02-28'`; `addMonths('2026-12', 1) === '2027-01'`; `addMonths('2027-01', -1) === '2026-12'`; `monthSchema` recusa `'2026-13'`, `isoDateSchema` recusa `'2026-02-30'`.
- [ ] **Step 2:** `pnpm --filter @glife/domain exec vitest run src/finance` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar.** Aritmética de datas com números (ano, mês, dia), sem `Date` com fuso. Algoritmo:
  ```
  invoiceMonthFor(d): fech = dateInMonth(monthOf(d), closing); se d >= fech: fech = dateInMonth(addMonths(monthOf(d),1), closing)
                      venc = dateInMonth(monthOf(fech), due); se venc <= fech: venc = dateInMonth(addMonths(monthOf(fech),1), due)
                      return monthOf(venc)
  invoiceDates(m):    venc = dateInMonth(m, due); fech = dateInMonth(m, closing); se fech >= venc: fech = dateInMonth(addMonths(m,-1), closing)
  ```
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** commit `feat(financas): calendário e fatura do cartão (fechamento, vencimento, mês da fatura)`.

### Task 2: Modelos e validação

**Files:**
- Create: `packages/domain/src/finance/model.ts`
- Modify: `packages/domain/src/finance/index.ts`
- Test: `packages/domain/src/finance/__tests__/model.test.ts`

**Interfaces:**
- Consumes: `baseEntitySchema`, `newId`/`setIdGenerator`, `nowIso` de `../core/index.ts` (mesmo uso de `notes/model.ts`); `centsSchema`; `isoDateSchema`, `monthSchema`.
- Produces: constantes `ACCOUNT_KINDS = ['checking','savings','cash','credit_card']`, `CATEGORY_KINDS = ['expense','income']`, `TX_TYPES = ['expense','income','transfer']`, `TX_STATUSES = ['planned','confirmed','skipped']`, `FREQUENCIES = ['weekly','monthly','yearly']`, `CATEGORY_COLORS` (8 chaves: `'slate','steel','sage','sand','clay','rose','plum','teal'`); schemas e tipos `Account`, `AccountDraft`, `Category`, `CategoryDraft`, `Transaction`, `TransactionDraft`, `Recurrence`, `RecurrenceDraft`, `Budget`, `BudgetDraft`; construtores `newAccount(draft, userId, clock)`, `newCategory`, `newTransaction`, `newRecurrence`, `newBudget` (mesmo padrão de `newNote`); `checkCategoryFits(type: TxType, accountKind: AccountKind, category: Category | null): boolean`.
- Campos exatamente como na seção "Modelo" da spec, exceto `interval` da recorrência, que se chama **`interval_count`** (palavra reservada no Postgres). `installment_of/index/count` e `recurrence_id/occurrence_date` opcionais (nulos).

- [ ] **Step 1: Testes que falham**
  - Cartão sem `closing_day`, `due_day` ou `payment_account_id` → `validation`; conta não-cartão com `closing_day` → `validation`; cartão com `initial_balance_cents ≠ 0` → `validation`.
  - `amount_cents` 0, negativo ou `1.5` → recusado.
  - `transfer` sem `to_account_id`, com `to_account_id === account_id` ou com `category_id` → recusado; `expense` com `to_account_id` → recusado.
  - Parcela com `installment_index` 0, `> installment_count` ou `count > 120`, ou só um dos três campos → recusado; `index 4, count 10` aceito.
  - Só `recurrence_id` sem `occurrence_date` → recusado.
  - Recorrência `interval` 0 ou `end_date < start_date` → recusada.
  - `checkCategoryFits`: expense+categoria expense ✔; expense+income ✘; income+expense em conta corrente ✘; income+expense em **cartão** ✔ (estorno); expense sem categoria ✔; transfer com categoria ✘.
  - `newTransaction` aplica `status: 'confirmed'` por padrão e carimba `user_id`/datas.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar com `z.object(...).superRefine`. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(financas): modelos de contas, categorias, transações, recorrências e orçamentos`.

### Task 3: Parcelas e cartão em uso

**Files:**
- Create: `packages/domain/src/finance/installments.ts`
- Test: `packages/domain/src/finance/__tests__/installments.test.ts`

**Interfaces:**
- Consumes: `splitInstallments`, `invoiceMonthFor`, `addMonths`, `dateInMonth`, `TransactionDraft`, `newId`.
- Produces:
  - `planInstallmentPurchase(input: { card: Account; totalCents: number; count: number; date: IsoDate; description: string; category_id: string | null }): TransactionDraft[]` — `count === 1` vira compra simples (sem campos de parcela).
  - `planOngoingInstallments(input: { card: Account; installmentCents: number; currentIndex: number; count: number; today: IsoDate; description: string; category_id: string | null }): TransactionDraft[]`
  - `planPreviousBalance(input: { card: Account; amountCents: number; today: IsoDate }): TransactionDraft` — `expense`, `description: 'Saldo anterior'`, sem categoria, `invoice_month = invoiceMonthFor(today)`.

- [ ] **Step 1: Testes que falham** (cartão fecha 3, vence 10)
  - `planInstallmentPurchase(total 100000, count 3, date '2026-11-28')` → 3 linhas: valores `[33334, 33333, 33333]`, `invoice_month` `['2026-12','2027-01','2027-02']`, `date` `['2026-11-28','2026-12-28','2027-01-28']`, `installment_index` 1..3, `installment_count` 3, todas com o mesmo `installment_of` = `id` da 1ª, `status 'confirmed'`.
  - Compra em `'2027-01-31'` 2× → datas `'2027-01-31','2027-02-28'`.
  - `planOngoingInstallments(installmentCents 25000, currentIndex 4, count 10, today '2026-11-24')` → **7** linhas, índices 4..10, todas 25000, 1ª com `invoice_month '2026-12'` (fatura aberta em 24/11), `installment_of` = id da linha índice 4.
  - `currentIndex > count` ou `< 1` → `RangeError`.
  - `planPreviousBalance(amount 124000, today '2026-11-24')` → `invoice_month '2026-12'`, `category_id null`.
  - Conta que não é cartão em qualquer uma das três → `RangeError`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(financas): compras parceladas e cadastro de cartão já em uso`.

### Task 4: Recorrências

**Files:**
- Create: `packages/domain/src/finance/recurrence.ts`
- Modify: `packages/domain/package.json` (dependência `"@noble/hashes": "^2.4.0"`, mesma versão do app; `pnpm install`)
- Test: `packages/domain/src/finance/__tests__/recurrence.test.ts`

**Interfaces:**
- Produces:
  - `occurrenceId(recurrenceId: string, date: IsoDate): string` — UUID v5 (SHA-1 de `namespace + "recurrenceId|date"`), namespace fixo `FINANCE_OCCURRENCE_NAMESPACE = '6f1d2c3e-8a4b-5c6d-9e7f-0a1b2c3d4e5f'`.
  - `type Occurrence = { id: string; recurrence_id: string; date: IsoDate; amount_cents: number; status: TxStatus; materialized: Transaction | null } & Pick<Recurrence,'type'|'account_id'|'to_account_id'|'category_id'|'description'>`
  - `expandRecurrence(rule: Recurrence, from: IsoDate, to: IsoDate, materialized: readonly Transaction[]): Occurrence[]` — início efetivo = maior entre `start_date` e a data de `created_at`; ocorrência com linha gravada **não excluída** usa a linha (valor, data, status); excluída é ignorada (ocorrência calculada volta).
  - `materializeOccurrence(rule: Recurrence, date: IsoDate, changes: { status: TxStatus; amount_cents?: number; date?: IsoDate }): TransactionDraft & { id: string }` — `id = occurrenceId(rule.id, date)`, `occurrence_date = date` (a original, mesmo se `changes.date` mudar a data).
  - `splitRecurrence(rule: Recurrence, from: IsoDate, changes: Partial<RecurrenceDraft>): { endedPatch: { end_date: IsoDate }; next: RecurrenceDraft }` — `end_date = from − 1 dia`, `next.start_date = from`.

- [ ] **Step 1: Testes que falham**
  - `occurrenceId(r, '2026-12-10')` é UUID válido (versão 5), igual em duas chamadas, diferente para outra data ou regra.
  - Mensal com início `'2026-01-31'`, `created_at` em 2026-01-01: de `'2026-01-01'` a `'2026-04-30'` → datas `'2026-01-31','2026-02-28','2026-03-31','2026-04-30'`.
  - Regra criada em `'2026-11-24'` com `start_date '2024-01-10'`: expandir de 2024 a dez/2026 → só `'2026-12-10'` (sem passado fantasma).
  - Semanal `interval 2`; anual em 29/02 → 28/02 em ano não bissexto; `end_date` respeitado.
  - Linha gravada `skipped` para 10/12 → ocorrência `status 'skipped'`; linha `confirmed` com valor 520000 → ocorrência com 520000; mesma linha com `deleted_at` → volta ao calculado `planned`.
  - `splitRecurrence(rule, '2027-03-10', { amount_cents: 550000 })` → `endedPatch.end_date '2027-03-09'`, `next.start_date '2027-03-10'`, `next.amount_cents 550000`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Confirmar que `boundaries.test.ts` continua verde.
- [ ] **Step 5:** commit `feat(financas): recorrências calculadas com ocorrência de id determinístico`.

### Task 5: Saldo, orçamento, fatura e previsão

**Files:**
- Create: `packages/domain/src/finance/ledger.ts`
- Test: `packages/domain/src/finance/__tests__/ledger.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–4.
- Produces:
  - `budgetMonth(tx: Transaction): Month | null` — `null` para transfer e skipped.
  - `accountBalance(account: Account, txs: readonly Transaction[]): number` — só `confirmed`; cartão = dívida (compras − estornos − pagamentos).
  - `type InvoiceStatus = 'open'|'closed'|'paid'|'partial'|'overdue'`; `invoiceSummary(card, invoiceMonth, txs, today, occurrences?: readonly Occurrence[]): { total; paid; remaining; status; closingDate; dueDate }` — `total` inclui previstos do cartão daquele mês (gravados e ocorrências).
  - `suggestInvoiceToPay(card, txs, today): Month | null` — fatura fechada mais antiga com `remaining > 0`.
  - `isOverdue(item: { status: TxStatus; date: IsoDate }, today): boolean`.
  - `monthSummary(month, { transactions, occurrences, accounts }): { income: { confirmed; planned }; expense: { confirmed; planned }; byCategory: Map<string | null, { confirmed; planned }> }` — usa `budgetMonth`.
  - `budgetFor(categoryId, month, budgets): number | null` — o `starts_month` mais recente `<= month`.
  - `projectBalance(account, until: IsoDate, today: IsoDate, data: { transactions; occurrences; cards: Account[] }): number` — saldo real + previstos não-cartão com data ≤ `until` (inclui atrasados) + para cada cartão com `payment_account_id === account.id`, `remaining` das faturas com vencimento ≤ `until`.

- [ ] **Step 1: Testes que falham** (conta corrente `CC` saldo inicial 210000; cartão `NU` fecha 3, vence 10, paga por `CC`)
  - Compra de 30000 no `NU` em 28/11 → `budgetMonth` `'2026-12'`; pagamento (transfer `CC→NU`, `invoice_month '2026-12'`) → `budgetMonth null`; `monthSummary('2026-12').expense.confirmed === 30000` (não 60000).
  - `accountBalance(NU)` após compra 30000 e pagamento 30000 → 0; `accountBalance(CC)` → 180000.
  - Estorno `income` 5000 no `NU` com categoria de despesa `Mercado` → `byCategory.get(mercado).confirmed === 25000` em `'2026-12'`.
  - `invoiceSummary('2026-12', today '2026-12-05')` com 30000 e sem pagamento → `status 'closed'`, `remaining 30000`; pago 10000 → `'partial'`; today `'2026-12-11'` sem pagar → `'overdue'`; pago 30000 → `'paid'`; today `'2026-11-24'` → `'open'`.
  - Assinatura recorrente mensal de 3990 no `NU`, `start_date '2026-11-26'` (criada em 24/11; cai na fatura de dez, a de 26/12 cai em jan) → entra em `invoiceSummary.total`, **não** direto em `projectBalance(CC)`; `projectBalance(CC, '2026-12-31', '2026-11-24')` = 210000 − 30000 − 3990 + salário previsto 500000 (dia 10).
  - `isOverdue({ status: 'planned', date: '2026-11-23' }, '2026-11-24') === true`; `confirmed` → false.
  - `budgetFor`: orçamentos `2026-10: 80000`, `2027-01: 90000` → `'2026-12'` → 80000, `'2027-02'` → 90000, `'2026-09'` → null.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(financas): saldo, orçamento pelo mês pago, situação da fatura e previsão`.

### Task 6: Repositórios — contrato e memória

**Files:**
- Create: `packages/domain/src/finance/repository.ts`, `packages/domain/src/testing/financeContract.ts`
- Modify: `packages/domain/src/testing/memory.ts` (`createInMemoryFinance(userId)`), `packages/domain/src/testing/index.ts`, `packages/domain/src/testing/__tests__/inMemory.test.ts`, `packages/domain/src/finance/index.ts`

**Interfaces:**
- Produces (`repository.ts`, mesmas regras de cabeçalho de `notes/repository.ts`):
  - `AccountsRepository { list({ includeArchived? }); get(id); create(draft); update(id, patch); archive(id); remove(id) }` — `create` de cartão valida que `payment_account_id` existe e não é cartão (`validation`).
  - `CategoriesRepository { list({ kind?, includeArchived? }); create; update; archive }`.
  - `TransactionsRepository { get; listRange({ from: IsoDate; to: IsoDate; accountId? }); listByInvoice(cardId, month); watchRange(query, listener, onError?); create(draft); createMany(drafts) /* atômico */; update(id, patch); confirm(id, { amount_cents?, date? }); skip(id); upsertOccurrence(draft & { id }); remove(id); restore(id) }` — `create/update` checam `checkCategoryFits` e existência das contas/categoria.
  - `RecurrencesRepository { listActive(on: IsoDate); get; create; end(id, endDate); split(id, from, changes) /* atômico: end + create */ }`.
  - `BudgetsRepository { list(); set(categoryId, startsMonth, amountCents) /* substitui o do mesmo mês */; remove(id) }`.
  - `FinanceRepositories = { accounts; categories; transactions; recurrences; budgets }`.
  - `financeRepositoryContract(name: string, make: () => Promise<{ finance: FinanceRepositories; userId: string }>)`.
- [ ] **Step 1: Contrato (testes)** — além do CRUD básico: `createMany` com uma linha inválida não grava nenhuma; `upsertOccurrence` duas vezes com o mesmo id → `listRange` devolve 1 linha com os dados da última; `upsertOccurrence` de uma linha excluída limpa `deleted_at`; `confirm` troca status e valor; `split` deixa 2 regras (antiga encerrada); `BudgetsRepository.set` duas vezes no mesmo mês → 1 orçamento; cartão com pagadora inexistente → `validation`; registro de outro dono → `not_found`.
- [ ] **Step 2:** ligar `financeRepositoryContract('memória', …)` em `inMemory.test.ts` → FAIL.
- [ ] **Step 3:** implementar `createInMemoryFinance`. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(financas): repositórios de finanças (contrato e memória)`.

### Task 7: Migração, RLS e sync

**Files:**
- Create: `supabase/migrations/20261124000001_finance_contas_transacoes.sql`, `supabase/tests/finance.test.ts`
- Modify: `supabase/powersync/sync-streams.yaml`

**Interfaces:**
- Produces: tabelas `accounts`, `categories`, `recurrences`, `transactions`, `budgets` com exatamente as colunas da spec (nomes iguais aos do Zod da Task 2); `date` para datas, `text` com `check (x ~ '^\d{4}-(0[1-9]|1[0-2])$')` para meses; `bigint` para centavos; recorrência usa `interval_count` (ver Task 2).
- `check`s: espelhar as regras da Task 2 que cabem numa linha (kind/type/status/frequency; campos de cartão; transfer; parcela completa; `recurrence_id`↔`occurrence_date`; `amount_cents > 0`). FKs compostas: `payment_account_id`, `account_id`, `to_account_id`, `category_id`, `recurrence_id` (`on delete set null (col)` nos opcionais; `account_id` obrigatório sem `set null`). Índices: `transactions (user_id, date)`, `(user_id, account_id, invoice_month)`, único parcial `budgets (user_id, category_id, starts_month) where deleted_at is null`.
- [ ] **Step 1: Testes que falham** em `finance.test.ts` (usar `createDatabase`/`asUser` de `./harness`): B não lê transações de A; A não aponta `category_id` para categoria de B (FK composta); `amount_cents = 0` recusado; cartão sem `closing_day` recusado; transfer com `to_account_id = account_id` recusado; segundo orçamento ativo mesma categoria/mês recusado.
- [ ] **Step 2:** `pnpm --filter supabase test` → FAIL. **Step 3:** escrever a migração + `vida_apply_standard` em cada tabela + `alter publication powersync add table …` + 5 linhas no `sync-streams.yaml` no mesmo formato das existentes. **Step 4:** PASS (inclui `syncStreams.test.ts` e `rls.test.ts`).
- [ ] **Step 5:** commit `feat(financas): migração de contas, categorias, transações, recorrências e orçamentos`.
- Não aplicar no hospedado nem publicar o YAML: isso fica para o usuário (registrar no STATUS).

### Task 8: Repositórios locais no app

**Files:**
- Create: `apps/app/src/features/finance/data/schema.ts` (`financeTables`), `apps/app/src/features/finance/data/localFinanceRepositories.ts` (`createLocalFinance(db: LocalDb, userId: string): FinanceRepositories`), `apps/app/src/features/finance/index.ts`
- Modify: `apps/app/tests/localSchema.test.ts` (incluir `financeTables` e as 5 tabelas na lista esperada), `apps/app/tests/localRepositories.test.ts` (`financeRepositoryContract('SQLite local', …)`), `apps/app/src/app/_layout.tsx` (somar `...financeTables` em `createLocalSync`)
- [ ] **Step 1:** incluir os testes acima → FAIL.
- [ ] **Step 2:** `schema.ts` no padrão de `notes/data/schema.ts` (booleanos `integer`, resto `text`/`integer`); repositório com SQL sempre parametrizado, `writeTransaction` em `createMany`/`split`/`set`, upsert por `insert … on conflict(id) do update`.
- [ ] **Step 3:** `pnpm --filter app test` → PASS; `pnpm lint && pnpm typecheck && pnpm test` na raiz.
- [ ] **Step 4:** commit `feat(financas): tabelas locais e repositórios de finanças no app`.

### Task 9: Fechamento

- [ ] Marcar no `docs/PLANO_DE_IMPLEMENTACAO.md` (Progresso) o modelo de finanças; substituir o `STATUS.md` (≤ 10 linhas) com: falta aplicar a migração no hospedado (`pnpm sb db push --remote`) e republicar o `sync-streams.yaml` no painel (usuário); próximo: telas de Finanças (perguntar protótipo).
- [ ] commit `docs(financas): progresso do modelo de dados`.
