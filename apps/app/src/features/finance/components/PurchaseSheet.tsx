// Folha "Comprei" (Compras, tela 3): o carrinho vira um gasto. Valor real (vem o estimado), conta ou cartão
// (parcelas e a fatura em que cai), categoria com o efeito no orçamento, data e o que acontece com os itens.
import {
  accountBalance,
  addMonths,
  budgetMonth,
  cartOf,
  cycleOf,
  invoiceDates,
  invoiceMonthFor,
  lastDayOf,
  monthOverview,
  planInstallmentPurchase,
  purchaseDescription,
  splitInstallments,
  type AfterPurchase,
  type IsoDate,
  type PurchaseReceipt,
  type ShoppingItem,
  type ShoppingList,
  type TransactionInput,
} from '@glife/domain/finance';
import { router } from 'expo-router';
import { CreditCard, Landmark, ReceiptText } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { Button, Chip, Icon, SegmentedControl, Sheet, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useFinance } from '../hooks/FinanceData';
import { useOccurrences } from '../hooks/useFlows';
import { categoryIcon } from './categories';
import { MONTH_NAMES, balance, dayLabel, dm, money } from './format';
import { NoFundsNote } from './sheets';
import { DateRow, MoneyField, NoCategoriesNote, RadioRow } from './ui';

const PARCS = Array.from({ length: 12 }, (_, i) => i + 1);
const monthLabel = (m: string) => MONTH_NAMES[Number(m.slice(5, 7)) - 1]!;

export interface PurchaseDone {
  receipt: PurchaseReceipt;
  cents: number;
}

type Props = {
  list: ShoppingList | null;
  items: readonly ShoppingItem[];
  today: IsoDate;
  onClose: () => void;
  onDone: (done: PurchaseDone) => void;
};

export function PurchaseSheet(props: Props) {
  const [session, setSession] = useState(0);
  const [was, setWas] = useState(!!props.list);
  if (!!props.list !== was) {
    setWas(!!props.list);
    if (props.list) setSession((n) => n + 1);
  }
  return (
    <Sheet visible={!!props.list} onClose={props.onClose}>
      {props.list && <PurchaseForm key={session} {...props} list={props.list} />}
    </Sheet>
  );
}

function PurchaseForm({ list, items, today, onDone, onClose }: Props & { list: ShoppingList }) {
  const s = useStyles();
  const t = useTheme();
  const { height } = useWindowDimensions();
  const { data, repos } = useFinance();
  const toast = useToast();
  const cart = items.filter((i) => i.in_cart);
  const est = cartOf(items);

  const accounts = (data?.accounts ?? []).filter((a) => !a.archived);
  const banks = accounts.filter((a) => a.kind !== 'credit_card');
  const cards = accounts.filter((a) => a.kind === 'credit_card');
  const categories = (data?.categories ?? []).filter((c) => c.kind === 'expense' && !c.archived);

  const [cents, setCents] = useState<number | null>(est.totalCents || null);
  const [source, setSource] = useState<'account' | 'card'>(banks.length === 0 && cards.length > 0 ? 'card' : 'account');
  const [bankId, setBankId] = useState(banks[0]?.id ?? null);
  const [cardId, setCardId] = useState(cards[0]?.id ?? null);
  const [parc, setParc] = useState(1);
  const [catId, setCatId] = useState<string | null>(list.category_id);
  const [date, setDate] = useState<IsoDate>(today);
  const [after, setAfter] = useState<AfterPurchase>('remove');
  const [forced, setForced] = useState(false);
  const [saving, setSaving] = useState(false);

  const value = cents ?? 0;
  const onCard = source === 'card';
  const account = accounts.find((a) => a.id === (onCard ? cardId : bankId)) ?? null;
  const available = !onCard && account && data ? accountBalance(account, data.transactions, data.flows) : null;
  const short = available !== null && value > available;

  // Linhas do gasto: uma na conta; no cartão, uma por parcela (cada uma na sua fatura).
  const description = purchaseDescription(list.name, cart);
  let rows: TransactionInput[] = [];
  if (account && value > 0) {
    rows =
      account.kind === 'credit_card'
        ? planInstallmentPurchase({ card: account, description, category_id: catId, totalCents: value, count: parc, date })
        : [{ type: 'expense', amount_cents: value, date, account_id: account.id, category_id: catId, description }];
  }

  // Orçamento do mês em que o gasto conta (no cartão, o da fatura).
  const first = rows[0];
  const countsIn = first ? budgetMonth({ type: 'expense', status: 'confirmed', invoice_month: first.invoice_month ?? null, date: first.date }) : null;
  const occurrences = useOccurrences(countsIn ? lastDayOf(countsIn) : today);
  const budgetRow = data && countsIn && catId ? monthOverview(data, occurrences, today, countsIn).budgets.find((x) => x.category.id === catId) : undefined;
  const budget = budgetRow && budgetRow.budget !== null && countsIn ? { rest: budgetRow.budget - budgetRow.spent - budgetRow.planned, month: countsIn } : null;
  const firstCents = first?.amount_cents ?? 0;

  let invoiceTxt = '';
  if (onCard && account) {
    const cycle = cycleOf(account);
    const inv = invoiceMonthFor(date, cycle);
    invoiceTxt =
      parc > 1
        ? `1ª parcela na fatura de ${monthLabel(inv)} · última na de ${monthLabel(addMonths(inv, parc - 1))}`
        : `Fatura de ${monthLabel(inv)} · vence ${dm(invoiceDates(inv, cycle).dueDate)}`;
  }

  const ready = rows.length > 0 && cart.length > 0 && !saving;
  const label = short && !forced ? 'Registrar mesmo assim' : `Registrar ${money(value)}`;

  const save = async () => {
    if (short && !forced) {
      setForced(true);
      return;
    }
    if (!ready) return;
    setSaving(true);
    try {
      const receipt = await repos.shopping.purchase({ listId: list.id, categoryId: catId, date, after, transactions: rows });
      onDone({ receipt, cents: value });
    } catch (e) {
      console.warn('Falha ao registrar a compra', e);
      setSaving(false);
      toast({ message: 'Não foi possível registrar: confira a conta e a categoria. Nada foi gravado.' });
    }
  };

  const noSource = banks.length === 0 && cards.length === 0;

  return (
    <View style={[s.root, { maxHeight: height - t.space[12] - t.space[8] }]}>
      <View style={s.header}>
        <Text variant="heading">Comprei</Text>
        <Text variant="caption" tone="tertiary" numeric>
          {`${cart.length} ${cart.length === 1 ? 'item' : 'itens'} · ${list.name}`}
        </Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <MoneyField
          large
          label="Valor pago"
          cents={cents}
          onChange={(c) => {
            setCents(c);
            setForced(false);
          }}
          hint={`${est.approx ? 'Estimado ≈ ' : 'Estimado '}${money(est.totalCents)}${est.approx ? ' · há item sem preço' : ''}`}
        />

        {noSource ? (
          <Text tone="tertiary">Cadastre uma conta em Finanças para registrar a compra.</Text>
        ) : (
          <>
            {banks.length > 0 && cards.length > 0 && (
              <SegmentedControl
                label="De onde saiu o dinheiro"
                options={[
                  { value: 'account', label: 'Conta' },
                  { value: 'card', label: 'Cartão' },
                ]}
                value={source}
                onChange={(v) => {
                  setSource(v);
                  setForced(false);
                }}
              />
            )}
            <View>
              {(onCard ? cards : banks).map((a) => (
                <RadioRow
                  key={a.id}
                  title={a.name}
                  sub={
                    a.kind === 'credit_card'
                      ? `Fecha dia ${a.closing_day}, vence dia ${a.due_day}`
                      : `Saldo ${data ? balance(accountBalance(a, data.transactions, data.flows)) : ''}`
                  }
                  selected={a.id === (onCard ? cardId : bankId)}
                  onPress={() => {
                    if (onCard) setCardId(a.id);
                    else setBankId(a.id);
                    setForced(false);
                  }}
                />
              ))}
            </View>
            {short && account && available !== null && <NoFundsNote accountName={account.name} available={available} cents={value} />}
          </>
        )}

        {onCard && account && (
          <>
            <View style={s.between}>
              <Text variant="label" tone="tertiary">
                Parcelas
              </Text>
              <Text variant="small" numeric style={s.medium}>
                {parc === 1 ? `À vista · ${money(value)}` : `${parc}× de ${money(splitInstallments(Math.max(value, parc), parc)[0]!)}`}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.parcs} style={s.parcScroll}>
              {PARCS.map((n) => (
                <Chip key={n} size="sm" numeric label={`${n}×`} selected={parc === n} onPress={() => setParc(n)} />
              ))}
            </ScrollView>
            <View style={s.note}>
              <Icon icon={ReceiptText} size={t.icon.small} color="textSecondary" />
              <Text variant="small" tone="secondary" numeric style={s.flex}>
                {invoiceTxt}
              </Text>
            </View>
          </>
        )}

        <Text variant="label" tone="tertiary">
          Categoria
        </Text>
        {categories.length === 0 && (
          <NoCategoriesNote
            kind="expense"
            onCreate={() => {
              onClose();
              router.push({ pathname: '/financas/categoria/[id]', params: { id: 'novo', tipo: 'expense' } });
            }}
          />
        )}
        <View style={s.chips}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              size="sm"
              label={c.name}
              icon={categoryIcon(c.icon)}
              selected={catId === c.id}
              onPress={() => setCatId(catId === c.id ? null : c.id)}
            />
          ))}
        </View>
        {budget && (
          <Text variant="caption" tone={budget.rest - firstCents < 0 ? 'warning' : 'tertiary'} numeric style={s.budget}>
            {`Orçamento de ${monthLabel(budget.month)}: restam ${balance(budget.rest)} → ${balance(budget.rest - firstCents)}`}
          </Text>
        )}

        <DateRow label="Data" date={date} display={dayLabel(date, today)} onChange={setDate} />

        <View style={s.afterBlock}>
          <Text variant="caption" tone="tertiary">
            Depois de registrar, os itens comprados
          </Text>
          <SegmentedControl
            label="O que acontece com os itens comprados"
            options={[
              { value: 'remove', label: 'Saem da lista' },
              { value: 'keep', label: 'Voltam aos pendentes' },
            ]}
            value={after}
            onChange={setAfter}
          />
        </View>
      </ScrollView>
      <Button
        label={label}
        icon={onCard ? CreditCard : Landmark}
        fullWidth
        haptic
        disabled={!ready}
        loading={saving}
        onPress={() => void save()}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.space[3] + t.space[0.5] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3], marginTop: -t.space[1.5] },
  scroll: { flexGrow: 0, flexShrink: 1, marginHorizontal: -t.space[5] },
  scrollContent: { gap: t.space[3] + t.space[0.5], paddingHorizontal: t.space[5], paddingBottom: t.space[2] },
  flex: { flex: 1 },
  medium: { fontFamily: t.type.chip.font },
  between: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: t.space[3] },
  parcScroll: { marginHorizontal: -t.space[5], flexGrow: 0 },
  parcs: { gap: t.space[1.5], paddingHorizontal: t.space[5] },
  note: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], marginTop: -t.space[1] },
  budget: { marginTop: -t.space[1] },
  afterBlock: { gap: t.space[2] },
}));
