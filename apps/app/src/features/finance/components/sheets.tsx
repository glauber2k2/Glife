// Folhas curtas: confirmar previsto (Tela 3), pagar fatura (Tela 4) e escolha com rádio (aplicar/encerrar regra).
import type { Account, IsoDate, PlannedItem } from '@glife/domain/finance';
import { ArrowLeftRight, Check, CircleDashed, HandCoins, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Icon, Input, Sheet, Text, makeStyles, useTheme } from '@/shared/ui';

import { accountIcon } from './categories';
import { dm, lateText, relativeDay } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { DateRow, MoneyField, RadioRow } from './ui';

// ---------- Saldo insuficiente ----------

/** Aviso de que a saída deixa a conta negativa; o botão ao lado vira "… mesmo assim". */
export function NoFundsNote({ accountName, available, cents }: { accountName: string; available: number; cents: number }) {
  const { balance } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.note} accessibilityLiveRegion="polite">
      <Icon icon={TriangleAlert} size={t.icon.tiny + t.hairline} color="danger" />
      <Text variant="small" tone="danger" numeric style={s.flex}>
        {`Sem saldo suficiente: ${accountName} tem ${balance(available)} e ficará com ${balance(available - cents)}.`}
      </Text>
    </View>
  );
}

/** Opção "Outra pessoa pagou": quem pagou (opcional) e a explicação de que o saldo não muda. */
function PaidByOtherFields({ who, onWho, what }: { who: string; onWho: (v: string) => void; what: string }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <>
      <Input label="Quem pagou (opcional)" value={who} onChangeText={onWho} placeholder="Ex.: Pai" maxLength={60} />
      <View style={s.note}>
        <Icon icon={HandCoins} size={t.icon.tiny + t.hairline} color="textTertiary" />
        <Text variant="caption" tone="tertiary" style={s.flex}>
          {`Não sai dinheiro de nenhuma conta sua: ${what} fica paga e o saldo não muda. Fica registrado como dinheiro recebido.`}
        </Text>
      </View>
    </>
  );
}

// ---------- Confirmar previsto ----------

export function ConfirmSheet({
  item,
  accountName,
  recurringLabel,
  available = null,
  today,
  onClose,
  onConfirm,
  onSkip,
  onPaidByOther,
  startPaidByOther = false,
}: {
  item: PlannedItem | null;
  accountName: string;
  recurringLabel?: string;
  /** saldo de hoje da conta de onde sai (null = não se aplica, ex.: cartão ou receita) */
  available?: number | null;
  today: IsoDate;
  onClose: () => void;
  onConfirm: (changes: { amount_cents: number; date: IsoDate }) => void;
  onSkip: () => void;
  /** gasto que outra pessoa pagou (só para gasto saindo de conta, não cartão) */
  onPaidByOther?: (changes: { amount_cents: number; date: IsoDate }, who: string | null) => void;
  /** abre já em "Outra pessoa pagou" */
  startPaidByOther?: boolean;
}) {
  // O último item fica guardado para a folha descer com o conteúdo ainda visível.
  const [last, setLast] = useState(item);
  if (item && item !== last) setLast(item);
  const shown = item ?? last;
  return (
    <Sheet visible={!!item} onClose={onClose} title={shown?.description || 'Previsto'}>
      {shown && (
        <ConfirmForm
          key={shown.key}
          item={shown}
          accountName={accountName}
          recurringLabel={recurringLabel}
          available={available}
          today={today}
          onConfirm={onConfirm}
          onSkip={onSkip}
          onPaidByOther={shown.type === 'expense' && available !== null ? onPaidByOther : undefined}
          startPaidByOther={startPaidByOther}
        />
      )}
    </Sheet>
  );
}

function ConfirmForm({
  item,
  accountName,
  recurringLabel,
  available,
  today,
  onConfirm,
  onSkip,
  onPaidByOther,
  startPaidByOther,
}: {
  item: PlannedItem;
  accountName: string;
  recurringLabel?: string;
  available: number | null;
  today: IsoDate;
  onConfirm: (changes: { amount_cents: number; date: IsoDate }) => void;
  onSkip: () => void;
  onPaidByOther?: (changes: { amount_cents: number; date: IsoDate }, who: string | null) => void;
  startPaidByOther: boolean;
}) {
  const { money, signed } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const [other, setOther] = useState(startPaidByOther && !!onPaidByOther);
  const [who, setWho] = useState('');
  const [cents, setCents] = useState<number | null>(item.amount_cents);
  const [date, setDate] = useState<IsoDate>(item.date);
  const late = item.date < today;
  const sub = `${late ? `Previsto para ${dm(item.date)} · ${lateText(item.date, today).toLowerCase()}` : 'Previsto para hoje'} · ${accountName}${recurringLabel ? ` · ${recurringLabel}` : ''}`;
  const value = cents ?? 0;
  const diff = value - item.amount_cents;
  const short = !other && item.type !== 'income' && available !== null && value > available;
  const hint = diff === 0 ? 'Igual ao previsto' : `${signed(diff)} em relação ao previsto (${money(item.amount_cents)})`;
  return (
    <>
      <Text variant="small" tone={late ? 'danger' : 'tertiary'} style={s.sub}>
        {sub}
      </Text>
      <MoneyField large label={item.type === 'income' ? 'Valor recebido' : 'Valor pago'} cents={cents} onChange={setCents} />
      <Text variant="caption" tone={diff === 0 ? 'tertiary' : 'accent'} numeric style={s.hint}>
        {hint}
      </Text>
      <DateRow date={date} hint={relativeDay(date, today)} onChange={setDate} />
      {other && <PaidByOtherFields who={who} onWho={setWho} what="a conta" />}
      {short && <NoFundsNote accountName={accountName} available={available!} cents={value} />}
      <View style={{ gap: t.space[1] }}>
        <Button
          label={other ? 'Marcar como pago' : short ? 'Confirmar mesmo assim' : 'Confirmar'}
          icon={other ? HandCoins : Check}
          fullWidth
          haptic
          disabled={!value}
          onPress={() =>
            other && onPaidByOther
              ? onPaidByOther({ amount_cents: value, date }, who.trim() || null)
              : onConfirm({ amount_cents: value, date })
          }
        />
        {onPaidByOther && (
          <Button
            label={other ? 'Saiu de uma conta minha' : 'Outra pessoa pagou'}
            icon={other ? undefined : HandCoins}
            variant="subtle"
            fullWidth
            onPress={() => setOther((v) => !v)}
          />
        )}
        <Button label="Pular este mês" variant="subtle" fullWidth onPress={onSkip} />
      </View>
    </>
  );
}

// ---------- Pagar fatura ----------

export function PaySheet({
  open,
  card,
  invoiceTitle,
  dueDate,
  remaining,
  payers,
  balances,
  defaultPayerId,
  today,
  onClose,
  onPay,
}: {
  open: boolean;
  card: Account | null;
  invoiceTitle: string;
  dueDate: IsoDate;
  remaining: number;
  payers: Account[];
  balances: Record<string, number>;
  defaultPayerId: string | null;
  today: IsoDate;
  onClose: () => void;
  onPay: (p: { cents: number; fromId: string; date: IsoDate; paidBy?: { who: string | null } }) => void;
}) {
  const { money, balance } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const [cents, setCents] = useState<number | null>(remaining || null);
  const [fromId, setFromId] = useState<string | null>(defaultPayerId ?? payers[0]?.id ?? null);
  const [date, setDate] = useState<IsoDate>(today);
  const [other, setOther] = useState(false);
  const [who, setWho] = useState('');
  // Reabriu: volta ao restante e à conta pagadora do cartão.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCents(remaining || null);
      setFromId(defaultPayerId ?? payers[0]?.id ?? null);
      setDate(today);
      setOther(false);
      setWho('');
    }
  }
  const value = cents ?? 0;
  const partial = value > 0 && value < remaining;
  // "Outra pessoa pagou": registra na conta que paga a fatura (entra e sai), sem mexer no saldo.
  const ledgerId = defaultPayerId ?? payers[0]?.id ?? null;
  const payer = other ? undefined : payers.find((a) => a.id === fromId);
  const available = fromId ? (balances[fromId] ?? 0) : 0;
  const short = !!payer && value > available;
  return (
    <Sheet
      visible={open}
      onClose={onClose}
      title="Pagar fatura"
      subtitle={card ? `${card.name} · ${invoiceTitle} · vence ${dm(dueDate)}` : undefined}
    >
      <MoneyField large label="Valor" cents={cents} onChange={setCents} />
      <View style={s.chips}>
        <Chip
          size="sm"
          numeric
          label={`Restante · ${money(remaining)}`}
          selected={value === remaining && remaining > 0}
          onPress={() => setCents(remaining)}
        />
      </View>
      {partial && (
        <View style={s.note}>
          <Icon icon={CircleDashed} size={t.icon.tiny + t.hairline} color="warning" />
          <Text variant="small" tone="warning" numeric style={s.flex}>
            {`Pagamento parcial: a fatura fica como parcial e restam ${money(remaining - value)} até ${dm(dueDate)}.`}
          </Text>
        </View>
      )}
      <Text variant="label" tone="tertiary">
        Pagar com
      </Text>
      <View style={[s.chips, s.tight]}>
        {payers.map((a) => (
          <Chip
            key={a.id}
            size="sm"
            icon={accountIcon(a.kind)}
            label={`${a.name}  ${balance(balances[a.id] ?? 0)}`}
            numeric
            selected={!other && fromId === a.id}
            onPress={() => {
              setOther(false);
              setFromId(a.id);
            }}
          />
        ))}
        {ledgerId && <Chip size="sm" icon={HandCoins} label="Outra pessoa pagou" selected={other} onPress={() => setOther(true)} />}
      </View>
      {other && <PaidByOtherFields who={who} onWho={setWho} what="a fatura" />}
      <DateRow date={date} hint={relativeDay(date, today)} onChange={setDate} />
      {!other && (
        <View style={s.note}>
          <Icon icon={ArrowLeftRight} size={t.icon.tiny} color="textTertiary" />
          <Text variant="caption" tone="tertiary" style={s.flex}>
            Sai da conta como transferência para o cartão. Não conta no orçamento.
          </Text>
        </View>
      )}
      {short && <NoFundsNote accountName={payer.name} available={available} cents={value} />}
      <Button
        label={
          !value
            ? 'Informe o valor'
            : other
              ? `Marcar ${money(value)} como pago`
              : short
                ? `Pagar ${money(value)} mesmo assim`
                : `Pagar ${money(value)}`
        }
        fullWidth
        haptic
        disabled={!value || (other ? !ledgerId : !fromId)}
        onPress={() => {
          if (other && ledgerId) onPay({ cents: value, fromId: ledgerId, date, paidBy: { who: who.trim() || null } });
          else if (fromId) onPay({ cents: value, fromId, date });
        }}
      />
    </Sheet>
  );
}

// ---------- Escolha com rádio ----------

export interface ChoiceOption<T extends string> {
  value: T;
  title: string;
  sub?: string;
}

export function ChoiceSheet<T extends string>({
  open,
  title,
  subtitle,
  options,
  value,
  onChange,
  note,
  cta,
  danger,
  onGo,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (v: T) => void;
  note?: string;
  cta: string;
  danger?: boolean;
  onGo: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Sheet visible={open} onClose={onClose} title={title} subtitle={subtitle}>
      <View>
        {options.map((o) => (
          <RadioRow key={o.value} title={o.title} sub={o.sub} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {note ? (
        <Text variant="small" tone="secondary" numeric>
          {note}
        </Text>
      ) : null}
      <View style={{ gap: t.space[1] }}>
        <Button label={cta} variant={danger ? 'danger' : 'primary'} fullWidth haptic onPress={onGo} />
        <Button label="Cancelar" variant="subtle" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  sub: { marginTop: -t.space[2] },
  hint: { marginTop: -t.space[1.5], paddingLeft: t.field.paddingX },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  tight: { marginTop: -t.space[1] },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[2] },
  flex: { flex: 1 },
}));
