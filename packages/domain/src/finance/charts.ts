// Números dos gráficos de Finanças (protótipo "Glife Gráficos"): entradas e saídas por mês ou semana, para onde foi
// o dinheiro, saldo das contas e patrimônio ao longo do tempo, detalhe de uma categoria e "Mês até agora".
// Mesmas regras do orçamento (ledger.ts): conta no mês em que é pago (fatura do cartão), transferência e pulado não
// entram, estorno no cartão abate o gasto. Só números e datas; textos e cores ficam no app.
import { addDays, addMonths, compareDates, daysInMonth, localDateOf, monthOf, type IsoDate, type Month } from './calendar.ts';
import { invoiceMonthFor } from './invoice.ts';
import { accountBalance, budgetFor, projectBalance, type Bucket } from './ledger.ts';
import { assetPosition, type InvestmentAsset, type InvestmentMovement } from './investments.ts';
import type { Account, Budget, Category, Transaction } from './model.ts';
import { lastDayOf, type FinanceData } from './overview.ts';
import type { Occurrence } from './recurrence.ts';

const alive = <T extends { deleted_at: string | null }>(r: T) => r.deleted_at === null;
const isCard = (a: Pick<Account, 'kind'>) => a.kind === 'credit_card';

// ---------- Lançamentos que entram nos gráficos ----------

/** Um lançamento (gravado ou previsto de uma regra) já com o mês do orçamento e o sinal de gasto. */
export interface ChartEntry {
  key: string;
  transactionId: string | null;
  description: string;
  date: IsoDate;
  /** Mês em que pesa (o da fatura, no cartão). */
  month: Month;
  kind: 'income' | 'expense';
  /** Gasto: positivo; estorno no cartão: negativo. Entrada: sempre positivo. */
  amount: number;
  category_id: string | null;
  account_id: string;
  planned: boolean;
}

/** Transações e ocorrências pendentes, na regra do orçamento (sem transferências nem pulados). */
export function chartEntries(data: Pick<FinanceData, 'accounts' | 'transactions'>, occurrences: readonly Occurrence[]): ChartEntry[] {
  const cards = new Map(data.accounts.filter(isCard).map((a) => [a.id, a]));
  const make = (
    m: { type: Transaction['type']; account_id: string; category_id: string | null; amount_cents: number; description: string; date: IsoDate },
    key: string,
    transactionId: string | null,
    month: Month,
    planned: boolean,
  ): ChartEntry => {
    const refund = m.type === 'income' && cards.has(m.account_id);
    const kind = m.type === 'income' && !refund ? 'income' : 'expense';
    return {
      key,
      transactionId,
      description: m.description,
      date: m.date,
      month,
      kind,
      amount: refund ? -m.amount_cents : m.amount_cents,
      category_id: m.category_id,
      account_id: m.account_id,
      planned,
    };
  };
  const out: ChartEntry[] = [];
  for (const t of data.transactions) {
    if (!alive(t) || t.type === 'transfer' || t.status === 'skipped' || t.is_adjustment) continue;
    out.push(make(t, t.id, t.id, t.invoice_month ?? monthOf(t.date), t.status === 'planned'));
  }
  for (const o of occurrences) {
    if (o.materialized !== null || o.status !== 'planned' || o.type === 'transfer') continue;
    const card = cards.get(o.account_id);
    const month =
      card && card.closing_day !== null && card.due_day !== null
        ? invoiceMonthFor(o.date, { closing_day: card.closing_day, due_day: card.due_day })
        : monthOf(o.date);
    out.push(make(o, o.id, null, month, true));
  }
  return out;
}

// ---------- Período ----------

export type ChartMode = 'month' | '6m' | '12m';

export interface ChartPeriod {
  mode: ChartMode;
  /** Último mês do período (o mês escolhido, no modo Mês). */
  anchor: Month;
  months: Month[];
  /** Período anterior de mesmo tamanho, para comparar; null em 12 meses. */
  previous: Month[] | null;
}

const monthRange = (last: Month, count: number) => Array.from({ length: count }, (_, i) => addMonths(last, i - count + 1));

export function chartPeriod(mode: ChartMode, anchor: Month): ChartPeriod {
  if (mode === 'month') return { mode, anchor, months: [anchor], previous: [addMonths(anchor, -1)] };
  if (mode === '6m') return { mode, anchor, months: monthRange(anchor, 6), previous: monthRange(addMonths(anchor, -6), 6) };
  return { mode, anchor, months: monthRange(anchor, 12), previous: null };
}

/** Primeiro mês com algum lançamento (limite da seta "Mês anterior"); null sem lançamentos. */
export function firstEntryMonth(entries: readonly ChartEntry[]): Month | null {
  return entries.reduce<Month | null>((min, e) => (min === null || e.month < min ? e.month : min), null);
}

// ---------- Entradas e saídas ----------

export interface FlowBucket {
  key: string;
  /** Mês do grupo (no modo Mês, o mês das semanas). */
  month: Month;
  /** Semana: primeiro e último dia (1–31); null quando o grupo é o mês inteiro. */
  days: { from: number; to: number } | null;
  income: Bucket;
  expense: Bucket;
}

const emptyBucket = (): Bucket => ({ confirmed: 0, planned: 0 });

function addTo(b: FlowBucket, e: ChartEntry) {
  const side = e.kind === 'income' ? b.income : b.expense;
  side[e.planned ? 'planned' : 'confirmed'] += e.amount;
}

export function monthBuckets(entries: readonly ChartEntry[], months: readonly Month[]): FlowBucket[] {
  const buckets = months.map((month) => ({ key: month, month, days: null, income: emptyBucket(), expense: emptyBucket() }));
  const byMonth = new Map(buckets.map((b) => [b.month, b]));
  for (const e of entries) {
    const b = byMonth.get(e.month);
    if (b) addTo(b, e);
  }
  return buckets;
}

/** Semanas do mês: 1–7, 8–14, 15–21, 22–28 e 29 ao fim (fevereiro de 28 dias fica com quatro). */
export function monthWeeks(month: Month): { from: number; to: number }[] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = daysInMonth(y, m);
  const weeks = [1, 8, 15, 22, 29].filter((d) => d <= last).map((from) => ({ from, to: Math.min(from + 6, last) }));
  const tail = weeks[weeks.length - 1]!;
  tail.to = last;
  return weeks;
}

/**
 * Semanas do mês. Compra no cartão cuja data cai fora do mês (pesa no mês da fatura) entra na primeira semana
 * (antes do mês) ou na última (depois).
 */
export function weekBuckets(entries: readonly ChartEntry[], month: Month): FlowBucket[] {
  const weeks = monthWeeks(month);
  const buckets: FlowBucket[] = weeks.map((days) => ({ key: `${month}-w${days.from}`, month, days, income: emptyBucket(), expense: emptyBucket() }));
  for (const e of entries) {
    if (e.month !== month) continue;
    const day = monthOf(e.date) === month ? Number(e.date.slice(8, 10)) : e.date < `${month}-01` ? 1 : 31;
    const i = weeks.findIndex((w) => day >= w.from && day <= w.to);
    addTo(buckets[i === -1 ? buckets.length - 1 : i]!, e);
  }
  return buckets;
}

export function flowTotals(buckets: readonly FlowBucket[]): { income: Bucket; expense: Bucket } {
  const income = emptyBucket();
  const expense = emptyBucket();
  for (const b of buckets) {
    income.confirmed += b.income.confirmed;
    income.planned += b.income.planned;
    expense.confirmed += b.expense.confirmed;
    expense.planned += b.expense.planned;
  }
  return { income, expense };
}

// ---------- Para onde foi ----------

/** Chave da linha sem categoria e da linha que agrupa o resto. */
export const NO_CATEGORY = '__none';
export const OTHER_CATEGORIES = '__other';

export interface CategorySlice {
  /** Id da categoria, NO_CATEGORY ou OTHER_CATEGORIES. */
  key: string;
  /** Categorias somadas (null = sem categoria), da maior para a menor. */
  categoryIds: (string | null)[];
  total: number;
  /** Fração do gasto do período (0–1). */
  share: number;
}

/** Até `maxRows` linhas: com mais categorias que isso, as maiores e "Outras" com o resto. Só o realizado. */
export function categoryBreakdown(entries: readonly ChartEntry[], months: readonly Month[], maxRows = 7): CategorySlice[] {
  const inPeriod = new Set(months);
  const sums = new Map<string | null, number>();
  for (const e of entries) {
    if (e.kind === 'expense' && !e.planned && inPeriod.has(e.month)) sums.set(e.category_id, (sums.get(e.category_id) ?? 0) + e.amount);
  }
  const sorted = [...sums].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const slice = (key: string, ids: (string | null)[], v: number): CategorySlice => ({ key, categoryIds: ids, total: v, share: total > 0 ? v / total : 0 });
  const single = ([id, v]: [string | null, number]) => slice(id ?? NO_CATEGORY, [id], v);
  if (sorted.length <= maxRows) return sorted.map(single);
  const top = sorted.slice(0, maxRows - 1).map(single);
  const rest = sorted.slice(maxRows - 1);
  return [...top, slice(OTHER_CATEGORIES, rest.map(([id]) => id), rest.reduce((s, [, v]) => s + v, 0))];
}

// ---------- Detalhe da categoria ----------

export interface CategoryBudget {
  month: Month;
  budget: number;
  spent: number;
  planned: number;
}

export interface CategoryDetail {
  total: number;
  planned: number;
  /** Gasto no período anterior; null quando não há período anterior para comparar. */
  previous: number | null;
  /** Gasto por mês (até 6 meses no modo Mês, terminando no mês escolhido). */
  byMonth: FlowBucket[];
  budget: CategoryBudget | null;
  /** Lançamentos do período, mais recentes primeiro. */
  entries: ChartEntry[];
}

export function categoryDetail(
  entries: readonly ChartEntry[],
  categoryIds: readonly (string | null)[],
  period: ChartPeriod,
  budgets: readonly Budget[],
  today: IsoDate,
): CategoryDetail {
  const ids = new Set(categoryIds);
  const mine = entries.filter((e) => e.kind === 'expense' && ids.has(e.category_id));
  const sum = (months: readonly Month[], planned: boolean) => {
    const set = new Set(months);
    return mine.filter((e) => e.planned === planned && set.has(e.month)).reduce((s, e) => s + e.amount, 0);
  };
  const chartMonths = period.mode === 'month' ? monthRange(period.anchor, 6) : period.months;
  const budgetMonth = period.mode === 'month' ? period.anchor : monthOf(today);
  const onlyId = categoryIds.length === 1 ? categoryIds[0] : null;
  const amount = onlyId ? budgetFor(onlyId, budgetMonth, budgets) : null;
  const inPeriod = new Set(period.months);
  return {
    total: sum(period.months, false),
    planned: sum(period.months, true),
    previous: period.previous ? sum(period.previous, false) : null,
    byMonth: monthBuckets(mine, chartMonths),
    budget: amount ? { month: budgetMonth, budget: amount, spent: sum([budgetMonth], false), planned: sum([budgetMonth], true) } : null,
    entries: mine
      .filter((e) => inPeriod.has(e.month))
      .sort((a, b) => (a.month !== b.month ? (a.month < b.month ? 1 : -1) : compareDates(b.date, a.date) || (a.key < b.key ? -1 : 1))),
  };
}

// ---------- Linhas no tempo ----------

export interface SeriesPoint {
  date: IsoDate;
  value: number;
  /** Ainda não aconteceu: valor esperado com previstos e faturas. */
  future: boolean;
  today: boolean;
}

/**
 * Datas das linhas. Modo Mês: cada dia (até o fim do mês, se for o atual). 6 e 12 meses: o fim do mês anterior ao
 * período, o fim de cada mês passado, hoje e, à frente, o fim deste mês e do próximo.
 */
export function seriesDates(period: ChartPeriod, today: IsoDate): Omit<SeriesPoint, 'value'>[] {
  const current = monthOf(today);
  const point = (date: IsoDate) => ({ date, future: date > today, today: date === today });
  if (period.mode === 'month') {
    if (period.anchor > current) return [];
    const end = lastDayOf(period.anchor);
    const out = [];
    for (let d = `${period.anchor}-01`; d <= end; d = addDays(d, 1)) out.push(point(d));
    return out;
  }
  const out = [point(lastDayOf(addMonths(period.months[0]!, -1)))];
  for (const m of period.months) if (m < current) out.push(point(lastDayOf(m)));
  if (period.anchor === current) {
    out.push(point(today));
    for (const m of [current, addMonths(current, 1)]) if (lastDayOf(m) > today) out.push(point(lastDayOf(m)));
  }
  return out;
}

/** Soma das contas (cartão fica fora: é dívida) em cada data; no futuro, o esperado. Começa no primeiro dado. */
export function balanceSeries(
  data: FinanceData,
  occurrences: readonly Occurrence[],
  today: IsoDate,
  dates: readonly Omit<SeriesPoint, 'value'>[],
): SeriesPoint[] {
  const banks = data.accounts.filter((a) => alive(a) && !isCard(a));
  if (banks.length === 0) return [];
  const flows = data.flows ?? [];
  const confirmed = data.transactions.filter((t) => alive(t) && t.status === 'confirmed');
  const starts = [
    ...confirmed.map((t) => t.date),
    ...flows.map((f) => f.date),
    ...banks.map((a) => localDateOf(a.created_at)).filter((d): d is IsoDate => d !== null),
  ];
  const first = starts.reduce<IsoDate | null>((min, d) => (min === null || d < min ? d : min), null);
  if (first === null) return [];
  const projection = { transactions: data.transactions, occurrences, cards: data.accounts.filter((a) => alive(a) && isCard(a)), flows };
  return dates
    .filter((p) => p.date >= first || p.date >= today)
    .map((p) => {
      const value = p.future
        ? banks.reduce((s, a) => s + projectBalance(a, p.date, projection), 0)
        : banks.reduce(
            (s, a) =>
              s +
              accountBalance(
                a,
                confirmed.filter((t) => t.date <= p.date),
                flows.filter((f) => f.date <= p.date),
              ),
            0,
          );
      return { ...p, value };
    });
}

/** Valor investido em cada data (sem futuro): cada ativo vale o que valia após o último movimento até ali. */
export function portfolioSeries(
  assets: readonly InvestmentAsset[],
  movements: readonly InvestmentMovement[],
  today: IsoDate,
  dates: readonly Omit<SeriesPoint, 'value'>[],
): SeriesPoint[] {
  const positions = assets.filter(alive).map((a) => assetPosition(a, movements, today));
  const firsts = positions.map((p) => p.firstDate).filter((d): d is IsoDate => d !== null);
  if (firsts.length === 0) return [];
  const first = firsts.reduce((a, b) => (a < b ? a : b));
  const valueAt = (date: IsoDate) =>
    positions.reduce((sum, p) => {
      if (date >= today) return sum + (p.closed ? 0 : p.current);
      // A série termina com o ponto de hoje (preço atual); antes de hoje vale o último movimento até a data.
      const past = p.series.slice(0, -1).filter((x) => x.date <= date);
      return sum + Math.max(0, past[past.length - 1]?.value ?? 0);
    }, 0);
  return dates.filter((p) => !p.future && p.date >= first).map((p) => ({ ...p, value: valueAt(p.date) }));
}

// ---------- Mês até agora ----------

export interface MonthSoFar {
  month: Month;
  spent: number;
  planned: number;
  /** Soma dos orçamentos das categorias de gasto; null quando nenhuma tem orçamento. */
  budget: number | null;
  /** Maior categoria do mês; `share` é a fração do gasto realizado. */
  top: CategorySlice | null;
}

export function monthSoFar(entries: readonly ChartEntry[], categories: readonly Category[], budgets: readonly Budget[], today: IsoDate): MonthSoFar {
  const month = monthOf(today);
  const [bucket] = monthBuckets(entries, [month]);
  const amounts = categories
    .filter((c) => alive(c) && !c.archived && c.kind === 'expense')
    .map((c) => budgetFor(c.id, month, budgets))
    .filter((v): v is number => v !== null);
  return {
    month,
    spent: bucket!.expense.confirmed,
    planned: bucket!.expense.planned,
    budget: amounts.length ? amounts.reduce((a, b) => a + b, 0) : null,
    top: categoryBreakdown(entries, [month], Number.POSITIVE_INFINITY)[0] ?? null,
  };
}

// ---------- Escala ----------

/** Valor redondo da linha de referência: o primeiro "bonito" acima de 110% do máximo. */
export function niceCeiling(max: number): number {
  if (max <= 0) return 0;
  const target = max * 1.1;
  const e = 10 ** Math.floor(Math.log10(target));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= target - 1e-9) return m * e;
  return 10 * e;
}
