// Exclusões de Finanças: detalhe de um lançamento com "Excluir" (uma parcela ou a compra inteira) e a confirmação
// de excluir uma conta ou um cartão (some junto com os lançamentos e as recorrências dele).
import { ADJUSTMENT_DESCRIPTION, type Account, type IsoDate, type PlannedItem, type Transaction } from '@glife/domain/finance';
import { router } from 'expo-router';
import { HandCoins, Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Sheet, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useAvailableFor, usePlannedActions } from '../hooks/useFlows';
import { dmy } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { NoFundsNote } from './sheets';
import { RadioRow } from './ui';

// ---------- Lançamento ----------

/** `open(tx)` mostra o lançamento com a opção de excluir; o elemento vai uma vez na tela. */
export function useTransactionSheet(opts: { aboveTabBar?: boolean } = {}): { open: (tx: Transaction) => void; element: ReactNode } {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [last, setLast] = useState<Transaction | null>(null);
  if (tx && tx !== last) setLast(tx);
  const shown = tx ?? last;
  const element = (
    <Sheet visible={!!tx} onClose={() => setTx(null)} title={shown ? shown.description || 'Lançamento' : undefined}>
      {shown && <TransactionDetail key={shown.id} tx={shown} onDone={() => setTx(null)} aboveTabBar={opts.aboveTabBar} />}
    </Sheet>
  );
  return { open: setTx, element };
}

function TransactionDetail({ tx, onDone, aboveTabBar }: { tx: Transaction; onDone: () => void; aboveTabBar?: boolean }) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { data } = useFinance();
  const { deleteTransactions } = useFinanceActions();
  const [scope, setScope] = useState<'one' | 'all'>('one');
  const [busy, setBusy] = useState(false);
  const accounts = new Map((data?.accounts ?? []).map((a) => [a.id, a.name]));
  const category = data?.categories.find((c) => c.id === tx.category_id);
  const series = tx.installment_of ? (data?.transactions ?? []).filter((x) => x.installment_of === tx.installment_of) : [];
  const where = tx.type === 'transfer' ? `${accounts.get(tx.account_id) ?? ''} → ${accounts.get(tx.to_account_id ?? '') ?? ''}` : (accounts.get(tx.account_id) ?? '');
  const kind = tx.is_adjustment
    ? `${ADJUSTMENT_DESCRIPTION} (${tx.type === 'income' ? 'entrada' : 'saída'})`
    : tx.type === 'transfer'
      ? 'Transferência'
      : tx.type === 'income'
        ? 'Receita'
        : 'Gasto';
  const details = [
    `${kind} · ${money(tx.amount_cents)}`,
    `${dmy(tx.date)} · ${where}`,
    category ? category.name : null,
    tx.installment_index ? `Parcela ${tx.installment_index} de ${tx.installment_count}` : null,
    tx.status === 'planned' ? 'Previsto (ainda não mexe no saldo)' : null,
  ].filter(Boolean) as string[];

  const remove = async () => {
    setBusy(true);
    try {
      const ids = scope === 'all' && series.length > 1 ? series.map((x) => x.id) : [tx.id];
      const undo = await deleteTransactions(ids);
      onDone();
      toast({
        message: ids.length > 1 ? `${ids.length} parcelas excluídas` : 'Lançamento excluído',
        actionLabel: 'Desfazer',
        aboveTabBar,
        onAction: () => void undo().catch((e) => console.warn('Falha ao desfazer', e)),
      });
    } catch (e) {
      console.warn('Falha ao excluir o lançamento', e);
      toast({ message: 'Não foi possível excluir.', aboveTabBar });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={s.details}>
        {details.map((d) => (
          <Text key={d} variant="small" tone="secondary" numeric>
            {d}
          </Text>
        ))}
      </View>
      {series.length > 1 && (
        <View>
          <RadioRow title="Só esta parcela" sub={`${tx.installment_index}/${tx.installment_count} · ${money(tx.amount_cents)}`} selected={scope === 'one'} onPress={() => setScope('one')} />
          <RadioRow
            title="A compra inteira"
            sub={`${series.length} parcelas · ${money(series.reduce((acc, x) => acc + x.amount_cents, 0))}`}
            selected={scope === 'all'}
            onPress={() => setScope('all')}
          />
        </View>
      )}
      {tx.recurrence_id && (
        <Text variant="caption" tone="tertiary">
          É de uma recorrência: só esta ocorrência sai, a regra continua. Para parar de vez, encerre a recorrência.
        </Text>
      )}
      <View style={{ gap: t.space[1] }}>
        <Button label="Excluir lançamento" icon={Trash2} variant="danger" fullWidth loading={busy} onPress={() => void remove()} />
        <Button label="Cancelar" variant="subtle" fullWidth onPress={onDone} />
      </View>
    </>
  );
}

// ---------- Previsto ----------

/**
 * `open(item)` mostra um previsto (linha gravada ou ocorrência calculada de uma regra) com "Confirmar" e "Excluir
 * este previsto" (pula só esta ocorrência; a regra continua). O elemento vai uma vez na tela.
 */
export function usePlannedSheet(today: IsoDate): { open: (item: PlannedItem) => void; element: ReactNode } {
  const [item, setItem] = useState<PlannedItem | null>(null);
  const [last, setLast] = useState<PlannedItem | null>(null);
  if (item && item !== last) setLast(item);
  const shown = item ?? last;
  const element = (
    <Sheet visible={!!item} onClose={() => setItem(null)} title={shown ? shown.description || 'Previsto' : undefined}>
      {shown && <PlannedDetail key={shown.key} item={shown} today={today} onDone={() => setItem(null)} />}
    </Sheet>
  );
  return { open: setItem, element };
}

function PlannedDetail({ item, today, onDone }: { item: PlannedItem; today: IsoDate; onDone: () => void }) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const { data } = useFinance();
  const planned = usePlannedActions(today);
  const available = useAvailableFor()(item);
  const short = available !== null && item.amount_cents > available;
  const [busy, setBusy] = useState<'confirm' | 'other' | 'skip' | null>(null);
  const account = data?.accounts.find((a) => a.id === item.account_id)?.name ?? '';
  const category = data?.categories.find((c) => c.id === item.category_id)?.name;
  const kind = item.type === 'transfer' ? 'Transferência' : item.type === 'income' ? 'Receita' : 'Gasto';
  const details = [`${kind} · ${money(item.amount_cents)}`, `${dmy(item.date)} · ${account}`, category ?? null, 'Previsto (ainda não mexe no saldo)'].filter(
    Boolean,
  ) as string[];
  const run = async (what: 'confirm' | 'other' | 'skip') => {
    setBusy(what);
    const ok =
      what === 'confirm' ? await planned.confirm(item) : what === 'other' ? await planned.paidByOther(item, null) : await planned.skip(item);
    setBusy(null);
    if (ok) onDone();
  };
  return (
    <>
      <View style={s.details}>
        {details.map((d) => (
          <Text key={d} variant="small" tone="secondary" numeric>
            {d}
          </Text>
        ))}
      </View>
      {item.recurrenceId && (
        <Text variant="caption" tone="tertiary">
          É de uma recorrência: excluir tira só esta ocorrência, a regra continua. Para parar de vez, encerre a recorrência.
        </Text>
      )}
      {short && <NoFundsNote accountName={account} available={available!} cents={item.amount_cents} />}
      <View style={{ gap: t.space[1] }}>
        <Button label={short ? 'Confirmar mesmo assim' : 'Confirmar'} fullWidth haptic disabled={busy !== null} loading={busy === 'confirm'} onPress={() => void run('confirm')} />
        {item.type === 'expense' && available !== null && (
          <Button
            label="Outra pessoa pagou"
            icon={HandCoins}
            variant="subtle"
            fullWidth
            disabled={busy !== null}
            loading={busy === 'other'}
            onPress={() => void run('other')}
          />
        )}
        <Button
          label="Excluir este previsto"
          icon={Trash2}
          variant="ghostDanger"
          fullWidth
          disabled={busy !== null}
          loading={busy === 'skip'}
          onPress={() => void run('skip')}
        />
      </View>
    </>
  );
}

// ---------- Conta ou cartão ----------

export function DeleteAccountSheet({ account, open, onClose }: { account: Account; open: boolean; onClose: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { removalImpact, deleteAccount } = useFinanceActions();
  const [impact, setImpact] = useState<{ transactions: number; recurrences: number; paysCards: Account[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const isCard = account.kind === 'credit_card';
  const noun = isCard ? 'cartão' : 'conta';

  useEffect(() => {
    if (!open) return;
    let active = true;
    void removalImpact(account.id)
      .then((r) => {
        if (active) setImpact(r);
      })
      .catch((e) => console.warn('Falha ao contar o que será excluído', e));
    return () => {
      active = false;
    };
  }, [open, account.id, removalImpact]);

  const blocked = (impact?.paysCards.length ?? 0) > 0;
  const parts = impact
    ? [
        `${impact.transactions} ${impact.transactions === 1 ? 'lançamento' : 'lançamentos'}`,
        `${impact.recurrences} ${impact.recurrences === 1 ? 'recorrência' : 'recorrências'}`,
      ].join(' e ')
    : '';

  const go = async () => {
    setBusy(true);
    try {
      await deleteAccount(account.id);
      onClose();
      toast({ message: isCard ? 'Cartão excluído' : 'Conta excluída', aboveTabBar: true });
      router.dismissTo('/financas');
    } catch (e) {
      console.warn(`Falha ao excluir ${noun}`, e);
      toast({ message: `Não foi possível excluir ${isCard ? 'o cartão' : 'a conta'}.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={open} onClose={onClose} title={`Excluir ${account.name}?`}>
      {blocked ? (
        <Text variant="small" tone="secondary" style={s.body}>
          {`Esta conta paga a fatura de ${impact!.paysCards.map((c) => c.name).join(', ')}. Exclua o cartão antes (ou crie outro cartão com outra conta pagadora).`}
        </Text>
      ) : (
        <Text variant="small" tone="secondary" style={s.body}>
          {impact
            ? `${isCard ? 'O cartão' : 'A conta'} some do app junto com ${parts} ${isCard ? 'dele' : 'dela'}. Os saldos e o orçamento deixam de contar esses valores.`
            : 'Contando o que vai junto…'}
        </Text>
      )}
      <View style={{ gap: t.space[1] }}>
        {!blocked && (
          <Button
            label={`Excluir ${noun}`}
            icon={Trash2}
            variant="danger"
            fullWidth
            haptic
            disabled={!impact}
            loading={busy}
            onPress={() => void go()}
          />
        )}
        <Button label={blocked ? 'Entendi' : 'Cancelar'} variant="subtle" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  details: { gap: t.space[0.5], marginTop: -t.space[2] },
  body: { marginTop: -t.space[1] },
}));
