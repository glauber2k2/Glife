// Contas e cartões (protótipo `contas`): total das contas (cartão não soma: a fatura é dívida), saldo de cada conta,
// fatura atual de cada cartão, modo "Ordenar" (subir/descer), "…" com ajustar saldo, editar e arquivar, e as
// arquivadas no fim (extrato guardado, "Reativar").
import { accountBalance, addMonths, lastDayOf, monthOf, monthOverview, type Account } from '@glife/domain/finance';
import { router } from 'expo-router';
import { ArrowUpDown, Archive, Check, CreditCard, Ellipsis, Plus } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { BackHeader, Button, EmptyState, IconButton, ListGroup, ListItem, Reveal, Screen, Section, Text, makeStyles, moduleHue, useTheme, useToast } from '@/shared/ui';

import { AccountActionsSheet } from '../components/AccountActionsSheet';
import { BalanceAdjustSheet } from '../components/BalanceAdjustSheet';
import { ACCOUNT_KIND_LABEL, accountIcon } from '../components/categories';
import { failureReason } from '../components/errors';
import { balance, dm, money, todayIso } from '../components/format';
import { INVOICE_STATUS } from '../components/status';
import { Disc, FlashRow, MoneyRow, OrderArrows, useCountUp } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { invoiceTitle, useOccurrences } from '../hooks/useFlows';
import { useOrdering } from '../hooks/useOrdering';

export function AccountsScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const month = monthOf(today);
  const { data } = useFinance();
  const { reorderAccounts, archiveAccount, unarchiveAccount } = useFinanceActions();
  const occurrences = useOccurrences(lastDayOf(addMonths(month, 1)));
  const overview = useMemo(() => (data ? monthOverview(data, occurrences, today, month) : null), [data, occurrences, today, month]);
  const [ordering, setOrdering] = useState(false);
  const [menuFor, setMenuFor] = useState<Account | null>(null);
  const [adjusting, setAdjusting] = useState<Account | null>(null);
  const [flash, setFlash] = useState<{ id: string; n: number }>({ id: '', n: 0 });
  const allIds = useMemo(() => (data?.accounts ?? []).map((a) => a.id), [data]);
  const order = useOrdering(allIds, reorderAccounts, (e) => {
    console.warn('Falha ao reordenar as contas', e);
    toast({ message: `Não foi possível salvar a ordem: ${failureReason(e)}` });
  });

  if (!data || !overview) return <Screen>{null}</Screen>;

  const live = data.accounts.filter((a) => a.deleted_at === null);
  const banks = order.sort(live.filter((a) => !a.archived && a.kind !== 'credit_card'));
  const cards = order.sort(live.filter((a) => !a.archived && a.kind === 'credit_card'));
  const archived = live.filter((a) => a.archived);
  const balanceOf = (a: Account) => accountBalance(a, data.transactions, data.flows);
  const total = banks.reduce((acc, a) => acc + balanceOf(a), 0);
  const cardInfo = new Map(overview.cards.map((c) => [c.card.id, c]));
  const canOrder = banks.length > 1 || cards.length > 1;

  const toggleOrdering = () => {
    if (ordering) order.reset();
    setMenuFor(null);
    setOrdering(!ordering);
  };

  const archive = async (a: Account) => {
    setMenuFor(null);
    const pays = live.filter((c) => c.kind === 'credit_card' && !c.archived && c.payment_account_id === a.id);
    if (pays.length > 0) {
      toast({ message: `Esta conta paga a fatura de ${pays.map((c) => c.name).join(', ')}. Troque a conta pagadora antes.` });
      return;
    }
    try {
      const undo = await archiveAccount(a.id);
      toast({
        message: a.kind === 'credit_card' ? 'Cartão arquivado' : 'Conta arquivada',
        icon: Archive,
        actionLabel: 'Desfazer',
        onAction: () => void undo().catch((e) => console.warn('Falha ao desfazer', e)),
      });
    } catch (e) {
      console.warn('Falha ao arquivar a conta', e);
      toast({ message: `Não foi possível arquivar: ${failureReason(e)}` });
    }
  };

  const reactivate = async (a: Account) => {
    try {
      await unarchiveAccount(a.id);
      toast({ message: a.kind === 'credit_card' ? 'Cartão de volta às escolhas' : 'Conta de volta às escolhas' });
    } catch (e) {
      console.warn('Falha ao reativar a conta', e);
      toast({ message: `Não foi possível reativar: ${failureReason(e)}` });
    }
  };

  const open = (a: Account) =>
    a.kind === 'credit_card'
      ? router.push({ pathname: '/financas/fatura/[id]', params: { id: a.id } })
      : router.push({ pathname: '/financas/conta/[id]', params: { id: a.id } });

  const trailing = (a: Account, list: Account[], i: number) =>
    ordering ? (
      <OrderArrows name={a.name} first={i === 0} last={i === list.length - 1} onMove={(d) => order.move(list, a.id, d)} />
    ) : (
      <IconButton
        icon={Ellipsis}
        label={`Opções de ${a.name}`}
        variant="ghost"
        size={t.size.iconButtonSmall}
        color="textSecondary"
        onPress={() => setMenuFor(a)}
      />
    );

  return (
    <Screen>
      <BackHeader
        title="Contas e cartões"
        fallback="/financas"
        right={<IconButton icon={Plus} label="Nova conta" onPress={() => router.push('/financas/nova-conta')} />}
      />
      <Reveal>
        {live.length === 0 ? (
          <EmptyState
            title="Nenhuma conta ainda"
            message="Adicione a conta corrente ou o cartão que você mais usa."
            actionLabel="Adicionar conta"
            mood="feliz"
            onAction={() => router.push('/financas/nova-conta')}
          />
        ) : (
          <View style={s.hero}>
            <Text variant="small" tone="tertiary">
              Total nas contas
            </Text>
            <Total cents={total} />
            {canOrder && (
              <View style={s.tools}>
                <Button
                  selfAlign="center"
                  label={ordering ? 'Pronto' : 'Ordenar'}
                  icon={ordering ? Check : ArrowUpDown}
                  variant="secondary"
                  size="sm"
                  onPress={toggleOrdering}
                />
              </View>
            )}
          </View>
        )}

        {banks.length > 0 && (
          <Section title="Contas">
            <ListGroup inset={t.size.rowInsetIcon}>
              {banks.map((a, i) => (
                <FlashRow key={a.id} flash={flash.id === a.id ? flash.n : 0}>
                  <AccountLine
                    account={a}
                    cents={balanceOf(a)}
                    trailing={trailing(a, banks, i)}
                    onPress={ordering ? undefined : () => open(a)}
                  />
                </FlashRow>
              ))}
            </ListGroup>
          </Section>
        )}

        {cards.length > 0 && (
          <Section title="Cartões">
            <ListGroup inset={t.size.rowInsetIcon}>
              {cards.map((c, i) => {
                const info = cardInfo.get(c.id);
                const st = info ? INVOICE_STATUS[info.summary.status] : null;
                const amount = info
                  ? info.summary.status === 'partial' || info.summary.status === 'overdue'
                    ? info.summary.remaining
                    : info.summary.total
                  : 0;
                return (
                  <MoneyRow
                    key={c.id}
                    leading={<Disc icon={CreditCard} />}
                    title={c.name}
                    meta={info && st ? `${invoiceTitle(info.invoiceMonth)} · ${st.label.toLowerCase()} · vence ${dm(info.summary.dueDate)}` : 'Cartão de crédito'}
                    amount={money(amount)}
                    amountSub={c.credit_limit_cents !== null ? { text: `limite ${money(c.credit_limit_cents)}` } : undefined}
                    trailing={trailing(c, cards, i)}
                    onPress={ordering ? undefined : () => open(c)}
                  />
                );
              })}
            </ListGroup>
          </Section>
        )}

        {archived.length > 0 && (
          <Section title="Arquivadas">
            <ListGroup>
              {archived.map((a) => (
                <ListItem
                  key={a.id}
                  icon={accountIcon(a.kind)}
                  title={a.name}
                  subtitle={a.kind === 'credit_card' ? 'Arquivado · faturas guardadas' : 'Arquivada · extrato guardado'}
                  onPress={() => open(a)}
                  trailing={<Button selfAlign="center" label="Reativar" variant="secondary" size="sm" onPress={() => void reactivate(a)} />}
                />
              ))}
            </ListGroup>
          </Section>
        )}
      </Reveal>

      <AccountActionsSheet
        account={menuFor}
        onClose={() => setMenuFor(null)}
        onAdjust={(a) => {
          setMenuFor(null);
          setAdjusting(a);
        }}
        onEdit={(a) => {
          setMenuFor(null);
          router.push({ pathname: '/financas/nova-conta', params: { id: a.id } });
        }}
        onArchive={(a) => void archive(a)}
      />
      <BalanceAdjustSheet
        account={adjusting}
        currentCents={adjusting ? balanceOf(adjusting) : 0}
        onClose={() => setAdjusting(null)}
        onAdjusted={(id) => setFlash((f) => ({ id, n: f.n + 1 }))}
      />
    </Screen>
  );
}

/** Total que conta até o valor novo. */
function Total({ cents }: { cents: number }) {
  const shown = useCountUp(cents);
  return (
    <Text variant="big" numeric accessibilityLabel={`Total nas contas ${balance(cents)}`}>
      {balance(shown)}
    </Text>
  );
}

/** Conta com o saldo que conta até o valor novo (ajuste de saldo). */
function AccountLine({ account, cents, trailing, onPress }: { account: Account; cents: number; trailing: ReactNode; onPress?: () => void }) {
  const shown = useCountUp(cents);
  return (
    <MoneyRow
      leading={<Disc icon={accountIcon(account.kind)} hue={moduleHue.investments} />}
      title={account.name}
      meta={ACCOUNT_KIND_LABEL[account.kind]}
      amount={balance(shown)}
      accessibilityLabel={`${account.name}, saldo ${balance(cents)}`}
      trailing={trailing}
      onPress={onPress}
    />
  );
}

const useStyles = makeStyles((t) => ({
  hero: { gap: t.space[1] },
  tools: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: t.space[2] },
}));
