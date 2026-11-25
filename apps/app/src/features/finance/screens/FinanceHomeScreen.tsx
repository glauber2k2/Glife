// Tela 1 do protótipo: Início de Finanças. Saldo hoje (contas), esperado no fim do mês, a confirmar, próximos,
// cartões, orçamento, contas, últimos lançamentos e planejamento. O seletor troca o mês (deslizando).
import {
  accountBalance,
  addMonths,
  isInvoiceDue,
  isRecurrenceActive,
  lastDayOf,
  monthOf,
  monthOverview,
  type CardOverview,
  type PlannedItem,
} from '@glife/domain/finance';
import { router } from 'expo-router';
import {
  ChartNoAxesColumn,
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Ellipsis,
  HandCoins,
  PencilLine,
  Plus,
  Repeat,
  SkipForward,
  type LucideIcon,
  ShoppingCart,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button, EmptyState, Icon, IconButton, Reveal, Screen, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { ACCOUNT_KIND_LABEL, accountIcon, categoryIcon, TRANSFER_ICON } from '../components/categories';
import { balance, dm, lateText, longDay, money, monthName, monthShort, signed, todayIso } from '../components/format';
import { NewEntrySheet } from '../components/NewEntrySheet';
import { useTransactionSheet } from '../components/deleteSheets';
import { INVOICE_STATUS } from '../components/status';
import { ConfirmSheet } from '../components/sheets';
import { Block, BlockHeader, BudgetBar, Disc, MoneyRow, MonthSlide, MonthStepper, useCountUp } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useShopping } from '../hooks/useShopping';
import { invoiceTitle, useAvailableFor, useOccurrences, usePayInvoice, usePlannedActions } from '../hooks/useFlows';

const MAX_AHEAD = 12;
const FREQ_LABEL = {
  weekly: 'semanal',
  monthly: 'mensal',
  yearly: 'anual',
} as const;

type Leaving = { item: PlannedItem; kind: 'confirmed' | 'skipped' };

export function FinanceHomeScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const today = todayIso();
  const { data } = useFinance();
  const shopping = useShopping();
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState(1);
  const month = addMonths(monthOf(today), offset);
  const occurrences = useOccurrences(lastDayOf(addMonths(month, 1)));
  const overview = useMemo(() => (data ? monthOverview(data, occurrences, today, month) : null), [data, occurrences, today, month]);

  const [entryOpen, setEntryOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [fixing, setFixing] = useState<PlannedItem | null>(null);
  const [fixingOther, setFixingOther] = useState(false);
  const [leaving, setLeaving] = useState<Record<string, Leaving>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const planned = usePlannedActions(today);
  const availableFor = useAvailableFor();
  const pay = usePayInvoice(today, true);
  const txSheet = useTransactionSheet({ aboveTabBar: true });

  const saldo = useCountUp(overview?.balanceToday ?? 0);
  const esperado = useCountUp(overview?.expected ?? 0);

  if (!data || !overview) return <Screen title="Finanças">{null}</Screen>;

  const accountsById = new Map(data.accounts.map((a) => [a.id, a]));
  const categoriesById = new Map(data.categories.map((c) => [c.id, c]));
  const rulesById = new Map(data.rules.map((r) => [r.id, r]));
  const banks = data.accounts.filter((a) => a.kind !== 'credit_card' && !a.archived);
  const hasAccounts = data.accounts.some((a) => !a.archived);
  const name = monthName(month, today);

  const settleLater = (item: PlannedItem, kind: Leaving['kind']) => {
    setLeaving((l) => ({ ...l, [item.key]: { item, kind } }));
    timers.current.push(setTimeout(() => setLeaving(({ [item.key]: _gone, ...rest }) => rest), reduceMotion ? 0 : t.motion.collapseDelay));
  };
  const doConfirm = async (item: PlannedItem, changes?: { amount_cents: number; date: string }) => {
    setMenuFor(null);
    // Sem saldo: em vez de confirmar direto, abre a folha com o aviso e "Confirmar mesmo assim".
    const available = availableFor(item);
    if (!changes && available !== null && item.amount_cents > available) {
      setFixingOther(false);
      setFixing(item);
      return;
    }
    if (await planned.confirm(item, changes)) settleLater(changes ? { ...item, amount_cents: changes.amount_cents } : item, 'confirmed');
  };
  const doPaidByOther = async (item: PlannedItem, who: string | null, changes: { amount_cents: number; date: string }) => {
    setMenuFor(null);
    if (await planned.paidByOther(item, who, changes)) settleLater({ ...item, amount_cents: changes.amount_cents }, 'confirmed');
  };
  const doSkip = async (item: PlannedItem) => {
    setMenuFor(null);
    if (await planned.skip(item)) settleLater(item, 'skipped');
  };

  // A confirmar: os pendentes e, por 650 ms, os que acabaram de ser confirmados ou pulados.
  const confirmRows = [
    ...overview.toConfirm.filter((p) => !leaving[p.key]).map((item) => ({ item, kind: null as Leaving['kind'] | null })),
    ...(overview.isCurrentMonth ? Object.values(leaving) : []),
  ].sort((a, b) => (a.item.date < b.item.date ? -1 : a.item.date > b.item.date ? 1 : 0));
  const pendingCount = overview.toConfirm.length;

  const ruleMeta = (p: PlannedItem) => {
    const rule = p.recurrenceId ? rulesById.get(p.recurrenceId) : null;
    return rule ? FREQ_LABEL[rule.frequency] : null;
  };
  const accountName = (id: string) => accountsById.get(id)?.name ?? '';
  const iconFor = (categoryId: string | null) => (categoryId ? categoryIcon(categoriesById.get(categoryId)?.icon) : TRANSFER_ICON);

  const goMonth = (delta: number) => {
    const next = offset + delta;
    if (next < 0 || next > MAX_AHEAD) return;
    setDir(delta);
    setMenuFor(null);
    setOffset(next);
  };

  const layout = reduceMotion
    ? undefined
    : Platform.OS === 'web'
      ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
      : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio);

  const budgetsShown = overview.budgets.filter((b) => b.budget !== null).slice(0, 5);
  const budgetCount = overview.budgets.filter((b) => b.budget !== null).length;
  const activeRules = data.rules.filter((r) => isRecurrenceActive(r, today)).length;
  const pendingItems = shopping ? shopping.items.filter((i) => !i.in_cart).length : 0;
  const shoppingMeta = !shopping || shopping.lists.length === 0 ? 'Listas' : pendingItems === 0 ? 'Nada faltando' : `${pendingItems} ${pendingItems === 1 ? 'item falta' : 'itens faltam'}`;

  return (
    <Screen
      eyebrow={longDay(today)}
      title="Finanças"
      action={
        hasAccounts ? (
          <MonthStepper
            label={name}
            onPrev={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            canPrev={offset > 0}
            canNext={offset < MAX_AHEAD}
          />
        ) : undefined
      }
    >
      {!hasAccounts ? (
        <EmptyState
          message="Nenhuma conta cadastrada."
          actionLabel="Adicionar conta"
          onAction={() => router.push('/financas/nova-conta')}
        />
      ) : (
        <MonthSlide id={month} direction={dir}>
          <Reveal>
            {/* Saldo */}
            <View style={s.hero}>
              <Text variant="label" tone="tertiary">
                Saldo hoje
              </Text>
              <Text variant="display" numeric style={s.heroValue} accessibilityLabel={`Saldo hoje ${balance(overview.balanceToday)}`}>
                {balance(saldo)}
              </Text>
              <View style={s.expected}>
                <Text tone="tertiary">Esperado em {dm(overview.endDate)}</Text>
                <Text variant="digit" numeric>
                  {balance(esperado)}
                </Text>
              </View>
              <View style={s.heroAction}>
                <Button label="Novo lançamento" icon={Plus} haptic onPress={() => setEntryOpen(true)} />
              </View>
            </View>

            {/* A confirmar */}
            {confirmRows.length > 0 && (
              <Block>
                <BlockHeader title="A confirmar" right={pendingCount ? String(pendingCount) : ''} />
                {confirmRows.map(({ item, kind }, i) => {
                  const late = item.date < today;
                  const rec = ruleMeta(item);
                  const done = kind === 'confirmed';
                  const skipped = kind === 'skipped';
                  return (
                    <Animated.View
                      key={item.key}
                      layout={layout}
                      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.gentle)}
                      style={[s.confirmRow, i > 0 && s.divider, menuFor === item.key && s.raised]}
                    >
                      <Disc icon={iconFor(item.category_id)} />
                      <View style={s.flex}>
                        <View style={s.confirmTop}>
                          <Struck on={skipped}>
                            <Text variant="item" tone={done ? 'primary' : skipped ? 'tertiary' : 'secondary'} numberOfLines={1}>
                              {item.description || 'Previsto'}
                            </Text>
                          </Struck>
                          <Struck on={skipped}>
                            <Text tone={done ? 'primary' : 'tertiary'} numeric style={s.medium}>
                              {signed(item.type === 'income' ? item.amount_cents : -item.amount_cents)}
                            </Text>
                          </Struck>
                        </View>
                        <Text variant="small" tone="tertiary">
                          {`${late ? dm(item.date) : 'Hoje'} · ${accountName(item.account_id)}${rec ? ` · ${rec}` : ''}`}
                        </Text>
                        {late && !kind && (
                          <View style={s.inline}>
                            <Icon icon={CircleAlert} size={t.icon.tiny} color="danger" />
                            <Text variant="caption" tone="danger" style={s.medium}>
                              {lateText(item.date, today)}
                            </Text>
                          </View>
                        )}
                        {!kind ? (
                          <View style={s.actions}>
                            <Button
                              selfAlign="center"
                              label="Confirmar"
                              icon={Check}
                              variant="secondary"
                              size="sm"
                              haptic
                              onPress={() => void doConfirm(item)}
                            />
                            <IconButton
                              icon={Ellipsis}
                              label="Mais opções"
                              variant="ghost"
                              color="textSecondary"
                              onPress={() => setMenuFor(menuFor === item.key ? null : item.key)}
                            />
                          </View>
                        ) : (
                          <View style={[s.inline, s.state]}>
                            <Icon icon={done ? Check : SkipForward} size={t.icon.small} color={done ? 'success' : 'textTertiary'} />
                            <Text variant="chip" tone={done ? 'success' : 'tertiary'}>
                              {done ? 'Confirmado' : `Pulado em ${monthName(monthOf(item.date), today)}`}
                            </Text>
                          </View>
                        )}
                      </View>
                      {menuFor === item.key && (
                        <View style={s.menu}>
                          <MenuItem icon={PencilLine} label="Corrigir valor" onPress={() => (setMenuFor(null), setFixingOther(false), setFixing(item))} />
                          {item.type === 'expense' && availableFor(item) !== null && (
                            <MenuItem
                              icon={HandCoins}
                              label="Outra pessoa pagou"
                              onPress={() => (setMenuFor(null), setFixingOther(true), setFixing(item))}
                            />
                          )}
                          <MenuItem icon={SkipForward} label="Pular este mês" onPress={() => void doSkip(item)} />
                          {item.recurrenceId && (
                            <MenuItem
                              icon={Repeat}
                              label="Editar recorrência"
                              onPress={() => {
                                setMenuFor(null);
                                router.push({
                                  pathname: '/financas/recorrente/[id]',
                                  params: { id: item.recurrenceId! },
                                });
                              }}
                            />
                          )}
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </Block>
            )}

            {/* Próximos */}
            <Block>
              <BlockHeader title="Próximos" right={`até ${dm(overview.endDate)}`} />
              {overview.upcoming.length === 0 && (
                <Text tone="tertiary" style={s.emptyLine}>
                  Nada previsto até o fim do mês.
                </Text>
              )}
              {overview.upcoming.map((x, i) => {
                if (isInvoiceDue(x)) {
                  const card = accountsById.get(x.cardId);
                  return (
                    <MoneyRow
                      key={`${x.cardId}|${x.invoiceMonth}`}
                      divider={i > 0}
                      leading={<DateCol date={x.dueDate} />}
                      title={`Fatura ${card?.name ?? ''}`}
                      dim
                      meta={`${x.payerId ? accountName(x.payerId) : ''} · ${invoiceTitle(x.invoiceMonth).toLowerCase()}`}
                      amount={signed(-x.remaining)}
                      onPress={() =>
                        router.push({
                          pathname: '/financas/fatura/[id]',
                          params: { id: x.cardId, mes: x.invoiceMonth },
                        })
                      }
                    />
                  );
                }
                return (
                  <MoneyRow
                    key={x.key}
                    divider={i > 0}
                    leading={<DateCol date={x.date} />}
                    title={x.description || 'Previsto'}
                    dim
                    recurring={!!x.recurrenceId}
                    meta={`${accountName(x.account_id)}${x.recurrenceId ? '' : ' · agendado'}`}
                    amount={signed(x.type === 'income' ? x.amount_cents : -x.amount_cents)}
                    onPress={
                      x.transactionId
                        ? () => {
                            const row = data.transactions.find((tx) => tx.id === x.transactionId);
                            if (row) txSheet.open(row);
                          }
                        : undefined
                    }
                  />
                );
              })}
            </Block>

            {/* Cartões */}
            {overview.cards.length > 0 && (
              <Block>
                <BlockHeader title="Cartões" />
                {overview.cards.map((c, i) => (
                  <CardRow key={c.card.id} c={c} divider={i > 0} onPay={() => pay.open(c.card.id, c.invoiceMonth)} />
                ))}
              </Block>
            )}

            {/* Orçamento */}
            <Block gap={t.space[4]}>
              <BlockHeader
                title="Orçamento do mês"
                right={
                  <Button
                    label="Ver todos"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: '/financas/orcamentos',
                        params: { mes: month },
                      })
                    }
                  />
                }
              />
              {budgetsShown.length === 0 ? (
                <Text tone="tertiary">Nenhum orçamento definido para {name}.</Text>
              ) : (
                budgetsShown.map((b, i) => {
                  const over = b.budget !== null && b.spent > b.budget;
                  const cap = over
                    ? `${money(b.spent - b.budget!)} acima do orçamento`
                    : b.planned > 0
                      ? `mais ${money(b.planned)} previsto`
                      : '';
                  return (
                    <View key={b.category.id} style={s.budget}>
                      <View style={s.budgetTop}>
                        <Text style={s.medium}>{b.category.name}</Text>
                        <Text variant="small" tone="secondary" numeric>
                          {`${money(b.spent)} de ${money(b.budget ?? 0)}`}
                        </Text>
                      </View>
                      <BudgetBar spent={b.spent} planned={b.planned} budget={b.budget} index={i} />
                      {cap ? (
                        <Text variant="caption" tone={over ? 'accent' : 'tertiary'} style={s.medium}>
                          {cap}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Block>

            {/* Contas */}
            <Block>
              <BlockHeader title="Contas" />
              {banks.map((a, i) => (
                <MoneyRow
                  key={a.id}
                  divider={i > 0}
                  leading={<Icon icon={accountIcon(a.kind)} size={t.icon.size - t.space[0.5]} color="textSecondary" />}
                  title={a.name}
                  meta={ACCOUNT_KIND_LABEL[a.kind]}
                  amount={balance(accountBalance(a, data.transactions))}
                  trailing={<Icon icon={ChevronRight} size={t.icon.small} color="textTertiary" />}
                  onPress={() =>
                    router.push({
                      pathname: '/financas/conta/[id]',
                      params: { id: a.id },
                    })
                  }
                />
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/financas/nova-conta')}
                style={({ pressed }) => [s.addRow, pressed && s.pressed]}
              >
                <Icon icon={Plus} size={t.icon.size - t.space[0.5]} color="accentInk" />
                <Text tone="accent" style={s.medium}>
                  Adicionar conta ou cartão
                </Text>
              </Pressable>
            </Block>

            {/* Últimos */}
            <Block>
              <BlockHeader title="Últimos lançamentos" />
              {overview.recent.length === 0 && (
                <Text tone="tertiary" style={s.emptyLine}>
                  Nenhum lançamento em {name} ainda.
                </Text>
              )}
              {overview.recent.map((r, i) => {
                const transfer = r.type === 'transfer';
                const from = accountName(r.account_id);
                const where = transfer ? `${from} → ${accountName(r.to_account_id ?? '')}` : from;
                const cat = transfer ? 'Transferência' : (categoriesById.get(r.category_id ?? '')?.name ?? 'Sem categoria');
                const value = r.type === 'income' ? r.amount_cents : -r.amount_cents;
                return (
                  <MoneyRow
                    key={r.id}
                    divider={i > 0}
                    leading={<Disc icon={iconFor(r.category_id)} />}
                    title={r.description || cat}
                    badge={r.installment_index ? `${r.installment_index}/${r.installment_count}` : undefined}
                    meta={`${dm(r.date)} · ${cat} · ${where}`}
                    amount={transfer ? money(r.amount_cents) : signed(value)}
                    amountTone={transfer ? 'secondary' : 'primary'}
                    onPress={() => txSheet.open(r)}
                  />
                );
              })}
            </Block>

            {/* Planejamento */}
            <Block gap={t.space[0]}>
              <BlockHeader title="Planejamento" />
              <PlanRow
                icon={Repeat}
                label="Recorrentes"
                meta={`${activeRules} ${activeRules === 1 ? 'regra' : 'regras'}`}
                onPress={() => router.push('/financas/recorrentes')}
              />
              <PlanRow
                icon={ShoppingCart}
                label="Compras"
                meta={shoppingMeta}
                onPress={() => router.push('/financas/compras')}
              />
              <PlanRow
                icon={ChartNoAxesColumn}
                label="Orçamentos"
                meta={`${budgetCount} ${budgetCount === 1 ? 'categoria' : 'categorias'}`}
                onPress={() =>
                  router.push({
                    pathname: '/financas/orcamentos',
                    params: { mes: month },
                  })
                }
              />
            </Block>
          </Reveal>
        </MonthSlide>
      )}

      <NewEntrySheet visible={entryOpen} onClose={() => setEntryOpen(false)} today={today} aboveTabBar />
      <ConfirmSheet
        item={fixing}
        accountName={fixing ? accountName(fixing.account_id) : ''}
        recurringLabel={fixing ? (ruleMeta(fixing) ?? undefined) : undefined}
        available={fixing ? availableFor(fixing) : null}
        startPaidByOther={fixingOther}
        onPaidByOther={(changes, who) => {
          const item = fixing!;
          setFixing(null);
          void doPaidByOther(item, who, changes);
        }}
        today={today}
        onClose={() => setFixing(null)}
        onConfirm={(changes) => {
          const item = fixing!;
          setFixing(null);
          void doConfirm(item, changes);
        }}
        onSkip={() => {
          const item = fixing!;
          setFixing(null);
          void doSkip(item);
        }}
      />
      {pay.element}
      {txSheet.element}
    </Screen>
  );
}

function DateCol({ date }: { date: string }) {
  const s = useStyles();
  return (
    <View style={s.dateCol}>
      <Text variant="digit" tone="secondary" numeric>
        {date.slice(8, 10)}
      </Text>
      <Text variant="label" tone="tertiary">
        {monthShort(date)}
      </Text>
    </View>
  );
}

function CardRow({ c, divider, onPay }: { c: CardOverview; divider: boolean; onPay: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const st = INVOICE_STATUS[c.summary.status];
  const extra = {
    open: `fecha ${dm(c.summary.closingDate)}`,
    closed: `fechou ${dm(c.summary.closingDate)}`,
    partial: `restam ${money(c.summary.remaining)}`,
    paid: 'fatura quitada',
    overdue: `venceu ${dm(c.summary.dueDate)}`,
  }[c.summary.status];
  const amount = c.summary.status === 'partial' || c.summary.status === 'overdue' ? c.summary.remaining : c.summary.total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.card.name}, ${invoiceTitle(c.invoiceMonth)}, ${st.label}`}
      onPress={() =>
        router.push({
          pathname: '/financas/fatura/[id]',
          params: { id: c.card.id, mes: c.invoiceMonth },
        })
      }
      style={({ pressed }) => [s.cardRow, divider && s.divider, pressed && s.pressed]}
    >
      <Disc icon={CreditCard} />
      <View style={s.flex}>
        <Text variant="item">{c.card.name}</Text>
        <Text variant="small" tone="tertiary">
          {`${invoiceTitle(c.invoiceMonth)} · vence ${dm(c.summary.dueDate)}`}
        </Text>
        <View style={s.inline}>
          <Icon icon={st.icon} size={t.icon.tiny} color={st.color} />
          <Text variant="caption" tone={st.tone} style={s.semibold}>
            {st.label}
          </Text>
          <Text variant="caption" tone="tertiary" numeric>
            {`· ${extra}`}
          </Text>
        </View>
      </View>
      <View style={s.cardRight}>
        <Text variant="item" numeric>
          {money(amount)}
        </Text>
        {c.summary.status !== 'paid' && c.summary.remaining > 0 && <Button label="Pagar" variant="secondary" size="sm" onPress={onPay} />}
      </View>
    </Pressable>
  );
}

function PlanRow({ icon, label, meta, onPress }: { icon: LucideIcon; label: string; meta: string; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.planRow, pressed && s.pressed]}>
      <Icon icon={icon} size={t.icon.size - t.space[0.5]} color="textSecondary" />
      <Text style={[s.flex, s.medium]}>{label}</Text>
      <Text variant="caption" tone="tertiary">
        {meta}
      </Text>
      <Icon icon={ChevronRight} size={t.icon.small} color="textTertiary" />
    </Pressable>
  );
}

function MenuItem({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable accessibilityRole="menuitem" onPress={onPress} style={({ pressed }) => [s.menuItem, pressed && s.pressed]}>
      <Icon icon={icon} size={t.icon.small} />
      <Text>{label}</Text>
    </Pressable>
  );
}

/** Traço de 1,5 px que risca da esquerda para a direita (pular). */
function Struck({ on, children }: { on: boolean; children: React.ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    k.set(reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: t.motion.standard }));
  }, [on, reduceMotion, k, t.motion.standard]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: k.get() }] }));
  return (
    <View style={s.struck}>
      {children}
      <Animated.View pointerEvents="none" style={[s.strike, style]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.label.font },
  hero: { gap: t.space[1.5], paddingBottom: t.space[1.5] },
  heroValue: { lineHeight: t.type.display.fontSize + t.space[1] },
  expected: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.space[2],
    flexWrap: 'wrap',
  },
  heroAction: { marginTop: t.space[3] + t.space[0.5], flexDirection: 'row' },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  confirmRow: {
    flexDirection: 'row',
    gap: t.space[3],
    paddingVertical: t.space[3] + t.space[0.5],
  },
  raised: { zIndex: 6, elevation: 0 },
  confirmTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: t.space[3],
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    marginTop: t.space[2] + t.space[0.5],
  },
  state: {
    marginTop: t.space[2] + t.space[0.5],
    minHeight: t.size.buttonSmall,
  },
  menu: {
    position: 'absolute',
    left: t.size.disc + t.space[3],
    top: t.size.disc * 3 + t.space[2],
    zIndex: 6,
    minWidth: t.size.menuWidth,
    padding: t.space[1.5],
    backgroundColor: t.colors.bg,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    borderRadius: t.radius.field,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    height: t.size.menuItem,
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.field - t.space[1],
  },
  pressed: { backgroundColor: t.colors.soft },
  emptyLine: { paddingVertical: t.space[1] },
  dateCol: { width: t.size.dateColumn, alignItems: 'center' },
  cardRow: {
    flexDirection: 'row',
    gap: t.space[3],
    paddingVertical: t.space[3] + t.space[0.5],
  },
  cardRight: { alignItems: 'flex-end', gap: t.space[2] },
  budget: { gap: t.space[2] },
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: t.space[3],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.button,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRowTall,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
    paddingVertical: t.space[2],
  },
  struck: { flexShrink: 1, justifyContent: 'center' },
  strike: {
    position: 'absolute',
    left: t.space[0],
    right: t.space[0],
    height: t.size.strike,
    backgroundColor: t.colors.textSecondary,
    transformOrigin: 'left center',
  },
}));
