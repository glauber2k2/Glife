// Fluxos repetidos entre telas: confirmar/pular previsto com "Desfazer" e pagar a fatura (folha + toast).
import {
  accountBalance,
  collectOccurrences,
  invoiceSummary,
  lastDayOf,
  type IsoDate,
  type Month,
  type Occurrence,
  type PlannedItem,
} from '@glife/domain/finance';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/shared/ui';

import { MONTH_NAMES, money } from '../components/format';
import { PaySheet } from '../components/sheets';
import { useFinance } from './FinanceData';
import { useFinanceActions } from './useFinanceActions';

/** Ocorrências calculadas de todas as regras até `until` (memorizadas por dados e data). */
export function useOccurrences(until: IsoDate): Occurrence[] {
  const { data } = useFinance();
  return useMemo(() => (data ? collectOccurrences(data, until) : []), [data, until]);
}

export const invoiceTitle = (month: Month) => `Fatura de ${MONTH_NAMES[Number(month.slice(5, 7)) - 1]}`;

export function usePlannedActions(today: IsoDate) {
  const toast = useToast();
  const { settle } = useFinanceActions();
  const monthName = MONTH_NAMES[Number(today.slice(5, 7)) - 1];

  const run = useCallback(
    async (item: PlannedItem, status: 'confirmed' | 'skipped', changes?: { amount_cents?: number; date?: IsoDate }) => {
      try {
        const undo = await settle(item, status, changes);
        const name = item.description || 'Previsto';
        toast({
          message: status === 'confirmed' ? `${name} confirmado` : `${name} pulado em ${monthName}`,
          actionLabel: 'Desfazer',
          onAction: () => void undo().catch((e) => console.warn('Falha ao desfazer', e)),
        });
        return true;
      } catch (e) {
        console.warn('Falha ao atualizar o previsto', e);
        toast({ message: 'Não foi possível salvar.' });
        return false;
      }
    },
    [settle, toast, monthName],
  );

  return {
    confirm: (item: PlannedItem, changes?: { amount_cents?: number; date?: IsoDate }) => run(item, 'confirmed', changes),
    skip: (item: PlannedItem) => run(item, 'skipped'),
  };
}

/** Folha "Pagar fatura": `open(cardId, mês)` abre; o elemento vai uma vez na tela. */
export function usePayInvoice(today: IsoDate): {
  open: (cardId: string, month: Month) => void;
  element: ReactNode;
} {
  const { data } = useFinance();
  const toast = useToast();
  const { payInvoice } = useFinanceActions();
  const [target, setTarget] = useState<{ cardId: string; month: Month } | null>(null);
  const [visible, setVisible] = useState(false);
  const occurrences = useOccurrences(lastDayOf(target?.month ?? today.slice(0, 7)));

  const card = target ? (data?.accounts.find((a) => a.id === target.cardId) ?? null) : null;
  const summary = card && target && data ? invoiceSummary(card, target.month, data.transactions, today, occurrences) : null;
  const banks = (data?.accounts ?? []).filter((a) => a.kind !== 'credit_card' && !a.archived);
  const balances = Object.fromEntries(banks.map((a) => [a.id, accountBalance(a, data?.transactions ?? [])]));

  const element = (
    <PaySheet
      open={visible && !!card}
      card={card}
      invoiceTitle={target ? invoiceTitle(target.month).toLowerCase() : ''}
      dueDate={summary?.dueDate ?? today}
      remaining={summary?.remaining ?? 0}
      payers={banks}
      balances={balances}
      defaultPayerId={card?.payment_account_id ?? null}
      today={today}
      onClose={() => setVisible(false)}
      onPay={async ({ cents, fromId, date }) => {
        if (!target) return;
        try {
          await payInvoice({
            cardId: target.cardId,
            month: target.month,
            cents,
            fromId,
            date,
          });
          setVisible(false);
          toast({ message: `Pagamento de ${money(cents)} registrado` });
        } catch (e) {
          console.warn('Falha ao pagar a fatura', e);
          toast({ message: 'Não foi possível registrar o pagamento.' });
        }
      }}
    />
  );

  return {
    open: (cardId, month) => {
      setTarget({ cardId, month });
      setVisible(true);
    },
    element,
  };
}
