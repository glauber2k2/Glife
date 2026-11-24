// Tela 4 do protótipo: Cartão e fatura. Seletor de fatura por mês, total, trilho pago/total, pago, restante,
// fechamento e vencimento, frase da regra do momento, previstos, compras e estornos, pagamentos.
import { addDays, addMonths, invoiceDetail, lastDayOf, monthOf, type Month } from '@glife/domain/finance';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Button, Icon, Reveal, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

import { categoryIcon } from '../components/categories';
import { MONTH_NAMES, dm, money, signed, todayIso } from '../components/format';
import { Block, BlockHeader, MoneyRow, MonthSlide, MonthStepper, ProgressTrack } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { invoiceTitle, useOccurrences, usePayInvoice } from '../hooks/useFlows';
import { INVOICE_STATUS } from '../components/status';
import { DeleteAccountSheet, usePlannedSheet, useTransactionSheet } from '../components/deleteSheets';

const monthOk = (m: unknown): m is Month => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const MAX_RANGE = 24;

export function InvoiceScreen() {
  const s = useStyles();
  const t = useTheme();
  const today = todayIso();
  const params = useLocalSearchParams<{ id: string; mes?: string }>();
  const { data } = useFinance();
  const card = data?.accounts.find((a) => a.id === params.id && a.kind === 'credit_card') ?? null;
  const [month, setMonth] = useState<Month>(monthOk(params.mes) ? params.mes : monthOf(today));
  const [dir, setDir] = useState(1);
  const occurrences = useOccurrences(lastDayOf(addMonths(month, 1)));
  const detail = useMemo(
    () => (card && data ? invoiceDetail(card, month, data, occurrences, today) : null),
    [card, data, month, occurrences, today],
  );
  const pay = usePayInvoice(today);
  const txSheet = useTransactionSheet();
  const plannedSheet = usePlannedSheet(today);
  const [deleting, setDeleting] = useState(false);

  if (!data) return <Screen>{null}</Screen>;
  if (!card || !detail) {
    return (
      <Screen>
        <BackHeader title="Cartão" fallback="/financas" />
        <Text tone="tertiary">Cartão não encontrado.</Text>
      </Screen>
    );
  }

  const payer = data.accounts.find((a) => a.id === card.payment_account_id);
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const { summary } = detail;
  const st = INVOICE_STATUS[summary.status];
  const nextName = MONTH_NAMES[Number(addMonths(month, 1).slice(5, 7)) - 1];
  const thisName = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  const lastPayment = detail.payments.at(-1);
  const note = {
    open: `Compras até ${dm(addDays(summary.closingDate, -1))} entram nesta fatura; a partir de ${dm(summary.closingDate)}, na de ${nextName}.`,
    closed: `Fechou em ${dm(summary.closingDate)}. Compras desde então vão para a fatura de ${nextName}.`,
    partial: `${money(summary.paid)} pagos${lastPayment ? ` em ${dm(lastPayment.date)}` : ''}. Faltam ${money(summary.remaining)} até ${dm(summary.dueDate)}.`,
    paid: `Paga${lastPayment ? ` em ${dm(lastPayment.date)}` : ''}${payer ? ` com ${payer.name}` : ''}. As compras contam no orçamento de ${thisName}; o pagamento, não.`,
    overdue: `Venceu em ${dm(summary.dueDate)} sem pagamento completo. Faltam ${money(summary.remaining)}.`,
  }[summary.status];
  const hasPlanned = detail.planned.length > 0;
  const plannedSum = detail.planned.reduce((acc, p) => acc + (p.type === 'expense' ? p.amount_cents : -p.amount_cents), 0);
  const base = monthOf(today);
  const go = (delta: number) => {
    const next = addMonths(month, delta);
    if (
      Math.abs(Number(next.slice(0, 4)) * 12 + Number(next.slice(5, 7)) - (Number(base.slice(0, 4)) * 12 + Number(base.slice(5, 7)))) >
      MAX_RANGE
    )
      return;
    setDir(delta);
    setMonth(next);
  };
  const limit = card.credit_limit_cents !== null ? ` · limite ${money(card.credit_limit_cents)}` : '';

  return (
    <Screen>
      <View>
        <BackHeader title={card.name} fallback="/financas" />
        <Text variant="small" tone="tertiary" style={s.sub}>
          {`Fecha dia ${card.closing_day} · vence dia ${card.due_day}${limit}`}
        </Text>
      </View>
      <MonthStepper
        label={invoiceTitle(month)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        prevLabel="Fatura anterior"
        nextLabel="Próxima fatura"
      />
      <MonthSlide id={month} direction={dir}>
        <Reveal>
          <View style={s.hero}>
            <View style={s.inline}>
              <Icon icon={st.icon} size={t.icon.tiny} color={st.color} />
              <Text variant="caption" tone={st.tone} style={s.semibold}>
                {st.label}
              </Text>
            </View>
            <Text variant="display" numeric style={s.heroValue}>
              {money(summary.total - plannedSum)}
            </Text>
            {hasPlanned && (
              <Text tone="tertiary" numeric>
                {`Com os previstos, fecha em ${money(summary.total)}`}
              </Text>
            )}
            <View style={s.track}>
              <ProgressTrack ratio={summary.total > 0 ? summary.paid / summary.total : 0} />
            </View>
            <View style={s.grid}>
              <Stat label="Pago" value={money(summary.paid)} />
              <Stat label="Restante" value={money(summary.remaining)} tone={summary.status === 'overdue' ? 'danger' : 'primary'} />
              <Stat label="Fechamento" value={dm(summary.closingDate)} />
              <Stat label="Vencimento" value={dm(summary.dueDate)} tone={summary.status === 'overdue' ? 'danger' : 'primary'} />
            </View>
            <Text variant="small" tone="secondary" style={s.note}>
              {note}
            </Text>
            {summary.remaining > 0 && summary.status !== 'open' && (
              <View style={s.payBtn}>
                <Button label="Pagar fatura" haptic onPress={() => pay.open(card.id, month)} />
              </View>
            )}
            {summary.remaining > 0 && summary.status === 'open' && (
              <View style={s.payBtn}>
                <Button label="Pagar antes do fechamento" variant="secondary" onPress={() => pay.open(card.id, month)} />
              </View>
            )}
          </View>

          {hasPlanned && (
            <Block>
              <BlockHeader title="Previstos nesta fatura" right={money(plannedSum)} />
              {detail.planned.map((p, i) => (
                <MoneyRow
                  key={p.key}
                  divider={i > 0}
                  leading={<Icon icon={categoryIcon(categories.get(p.category_id ?? '')?.icon)} size={t.icon.small} color="textTertiary" />}
                  title={p.description || 'Previsto'}
                  dim
                  recurring={!!p.recurrenceId}
                  meta={`${dm(p.date)} · previsto${p.category_id ? ` · ${categories.get(p.category_id)?.name ?? ''}` : ''}`}
                  amount={signed(p.type === 'expense' ? -p.amount_cents : p.amount_cents)}
                  onPress={() => plannedSheet.open(p)}
                />
              ))}
            </Block>
          )}

          <Block>
            <BlockHeader title="Compras e estornos" right={`${detail.items.length} ${detail.items.length === 1 ? 'item' : 'itens'}`} />
            {detail.items.length === 0 && (
              <Text tone="tertiary" style={s.empty}>
                Nenhuma compra nesta fatura.
              </Text>
            )}
            {detail.items.map((x, i) => {
              const cat = categories.get(x.category_id ?? '');
              return (
                <MoneyRow
                  key={x.id}
                  divider={i > 0}
                  leading={<Icon icon={categoryIcon(cat?.icon)} size={t.icon.small} color="textSecondary" />}
                  title={x.description || cat?.name || 'Compra'}
                  badge={x.installment_index ? `${x.installment_index}/${x.installment_count}` : undefined}
                  meta={`${dm(x.date)}${cat ? ` · ${cat.name}` : ''}`}
                  amount={signed(x.type === 'expense' ? -x.amount_cents : x.amount_cents)}
                  onPress={() => txSheet.open(x)}
                />
              );
            })}
          </Block>

          {detail.payments.length > 0 && (
            <Block>
              <BlockHeader title="Pagamentos" />
              {detail.payments.map((p, i) => (
                <MoneyRow
                  key={p.id}
                  divider={i > 0}
                  leading={<Icon icon={ArrowLeftRight} size={t.icon.small} color="textSecondary" />}
                  title="Pagamento da fatura"
                  meta={`${dm(p.date)} · do ${data.accounts.find((a) => a.id === p.account_id)?.name ?? ''} · transferência`}
                  amount={money(p.amount_cents)}
                  onPress={() => txSheet.open(p)}
                />
              ))}
            </Block>
          )}
          <View style={s.danger}>
            <Button label="Excluir cartão" variant="ghostDanger" onPress={() => setDeleting(true)} />
          </View>
        </Reveal>
      </MonthSlide>
      {pay.element}
      {txSheet.element}
      {plannedSheet.element}
      <DeleteAccountSheet account={card} open={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

function Stat({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'danger' }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text variant="label" tone="tertiary">
        {label}
      </Text>
      <Text variant="item" numeric tone={tone}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sub: { marginTop: t.space[1.5] },
  hero: { gap: t.space[1.5] },
  heroValue: { lineHeight: t.type.display.fontSize + t.space[1] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  semibold: { fontFamily: t.type.label.font },
  track: { marginTop: t.space[2] + t.space[0.5] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: t.space[3] + t.space[0.5],
    marginTop: t.space[3],
  },
  stat: { width: '50%', gap: t.space[0.5] },
  note: { marginTop: t.space[2] + t.space[0.5] },
  payBtn: { marginTop: t.space[3], flexDirection: 'row' },
  empty: { paddingVertical: t.space[1] },
  danger: { flexDirection: 'row', marginLeft: -(t.space[3] + t.space[0.5]) },
}));
