// Folhas curtas: confirmar previsto (Tela 3), pagar fatura (Tela 4) e escolha com rádio (aplicar/encerrar regra).
import type { Account, IsoDate, PlannedItem } from '@glife/domain/finance';
import { ArrowLeftRight, Check, CircleDashed } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Icon, Sheet, Text, makeStyles, useTheme } from '@/shared/ui';

import { accountIcon } from './categories';
import { balance, dayLabel, dm, lateText, money, signed } from './format';
import { DateRow, MoneyField, RadioRow } from './ui';

// ---------- Confirmar previsto ----------

export function ConfirmSheet({
  item,
  accountName,
  recurringLabel,
  today,
  onClose,
  onConfirm,
  onSkip,
}: {
  item: PlannedItem | null;
  accountName: string;
  recurringLabel?: string;
  today: IsoDate;
  onClose: () => void;
  onConfirm: (changes: { amount_cents: number; date: IsoDate }) => void;
  onSkip: () => void;
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
          today={today}
          onConfirm={onConfirm}
          onSkip={onSkip}
        />
      )}
    </Sheet>
  );
}

function ConfirmForm({
  item,
  accountName,
  recurringLabel,
  today,
  onConfirm,
  onSkip,
}: {
  item: PlannedItem;
  accountName: string;
  recurringLabel?: string;
  today: IsoDate;
  onConfirm: (changes: { amount_cents: number; date: IsoDate }) => void;
  onSkip: () => void;
}) {
  const s = useStyles();
  const t = useTheme();
  const [cents, setCents] = useState<number | null>(item.amount_cents);
  const [date, setDate] = useState<IsoDate>(item.date);
  const late = item.date < today;
  const sub = `${late ? `Previsto para ${dm(item.date)} · ${lateText(item.date, today).toLowerCase()}` : 'Previsto para hoje'} · ${accountName}${recurringLabel ? ` · ${recurringLabel}` : ''}`;
  const value = cents ?? 0;
  const diff = value - item.amount_cents;
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
      <DateRow date={date} display={dayLabel(date, today)} onChange={setDate} />
      <View style={{ gap: t.space[1] }}>
        <Button
          label="Confirmar"
          icon={Check}
          fullWidth
          haptic
          disabled={!value}
          onPress={() => onConfirm({ amount_cents: value, date })}
        />
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
  onPay: (p: { cents: number; fromId: string; date: IsoDate }) => void;
}) {
  const s = useStyles();
  const t = useTheme();
  const [cents, setCents] = useState<number | null>(remaining || null);
  const [fromId, setFromId] = useState<string | null>(defaultPayerId ?? payers[0]?.id ?? null);
  const [date, setDate] = useState<IsoDate>(today);
  // Reabriu: volta ao restante e à conta pagadora do cartão.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCents(remaining || null);
      setFromId(defaultPayerId ?? payers[0]?.id ?? null);
      setDate(today);
    }
  }
  const value = cents ?? 0;
  const partial = value > 0 && value < remaining;
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
            selected={fromId === a.id}
            onPress={() => setFromId(a.id)}
          />
        ))}
      </View>
      <DateRow date={date} display={dayLabel(date, today)} onChange={setDate} />
      <View style={s.note}>
        <Icon icon={ArrowLeftRight} size={t.icon.tiny} color="textTertiary" />
        <Text variant="caption" tone="tertiary" style={s.flex}>
          Sai da conta como transferência para o cartão. Não conta no orçamento.
        </Text>
      </View>
      <Button
        label={value ? `Pagar ${money(value)}` : 'Informe o valor'}
        fullWidth
        haptic
        disabled={!value || !fromId}
        onPress={() => fromId && onPay({ cents: value, fromId, date })}
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
