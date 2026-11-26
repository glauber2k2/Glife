// Folha "Novo movimento" / "Editar movimento" de um ativo (protótipo 3a–3e): tipo, valor (com ganho/perda no
// rendimento), quantidade (ativo automático), data, conta de Finanças (aporte e resgate) e observação. A linha
// abaixo do valor mostra o efeito no ativo; na cotação, a diferença em relação ao valor anterior.
import {
  MOVEMENT_NOTES_MAX,
  assetPosition,
  isAutoQuoted,
  type Account,
  type InvestmentAsset,
  type InvestmentMovement,
  type MovementKind,
} from '@glife/domain/finance';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, SegmentedControl, Sheet, Text, makeStyles, type TextTone } from '@/shared/ui';

import { dm, relativeDay } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { parseQuantity, pctSigned, quantityText } from './investmentFormat';
import { MOVEMENT_LABELS, resultTone } from './investmentRows';
import { DateRow, MoneyField } from './ui';

export interface MovementDraft {
  kind: MovementKind;
  amount_cents: number;
  quantity: number | null;
  date: string;
  account_id: string | null;
  notes: string;
}

export interface MovementSheetProps {
  visible: boolean;
  asset: InvestmentAsset;
  movements: readonly InvestmentMovement[];
  /** contas que podem pagar/receber (não cartão), com o saldo de hoje */
  accounts: readonly { account: Account; balance: number }[];
  editing: InvestmentMovement | null;
  initialKind: MovementKind;
  today: string;
  onClose: () => void;
  onSave: (draft: MovementDraft) => Promise<void>;
  onDelete: (movement: InvestmentMovement) => void;
}

export function MovementSheet(p: MovementSheetProps) {
  return (
    <Sheet visible={p.visible} onClose={p.onClose} title={p.editing ? 'Editar movimento' : 'Novo movimento'} subtitle={p.asset.name}>
      {p.visible && <MovementForm key={p.editing?.id ?? p.initialKind} {...p} />}
    </Sheet>
  );
}

const VALUE_LABELS: Record<MovementKind, string> = {
  contribution: 'Valor do aporte',
  withdrawal: 'Valor do resgate',
  income: 'Valor do rendimento',
  quote: 'Valor atual do ativo',
};

function MovementForm({ asset, movements, accounts, editing, initialKind, today, onSave, onDelete }: MovementSheetProps) {
  const { money, signed, balance, toneOf } = useMoneyFormat();
  const s = useStyles();
  const auto = isAutoQuoted(asset.kind);
  const [kind, setKind] = useState<MovementKind>(editing?.kind ?? initialKind);
  const [cents, setCents] = useState<number | null>(editing ? Math.abs(editing.amount_cents) : null);
  const [loss, setLoss] = useState(editing ? editing.amount_cents < 0 : false);
  const [qtyText, setQtyText] = useState(editing?.quantity ? quantityText(editing.quantity) : '');
  const [date, setDate] = useState(editing?.date ?? today);
  const [accountId, setAccountId] = useState<string | null>(editing?.account_id ?? null);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const base = assetPosition(asset, movements, today, editing?.id);
  const flow = kind === 'contribution' || kind === 'withdrawal';
  const needsQty = auto && flow;
  const qty = needsQty ? parseQuantity(qtyText) : null;
  const v = cents ?? 0;
  const account = flow ? accounts.find((a) => a.account.id === accountId) : undefined;

  // Linha de efeito e avisos (como no protótipo).
  let helper = '';
  let helperTone: TextTone = 'tertiary';
  let blocked = false;
  if (kind === 'contribution') {
    helper = `Investido: ${money(base.invested)}${v > 0 ? ` → ${money(base.invested + v)}` : ''}`;
  } else if (kind === 'withdrawal') {
    if (auto && qty !== null && qty > (base.units ?? 0)) {
      helper = `Mais que as cotas que você tem (${quantityText(base.units ?? 0)}).`;
      helperTone = 'warning';
      blocked = true;
    } else if (!auto && v > base.current) {
      helper = `Maior que o valor atual do ativo (${money(base.current)}).`;
      helperTone = 'warning';
    } else {
      helper = `Valor atual: ${money(base.current)}${v > 0 && !auto ? ` → ${money(base.current - v)}` : ''}`;
    }
  } else if (kind === 'income') {
    helper = auto
      ? 'Entra no resultado; não muda o valor das cotas.'
      : `Valor atual: ${money(base.current)}${v > 0 ? ` → ${balance(base.current + (loss ? -v : v))}` : ''}`;
  } else if (v > 0) {
    const d = v - base.current;
    helper = `${signed(d)} (${pctSigned(base.current > 0 ? d / base.current : 0)}) em relação a ${money(base.current)}${base.lastQuoteDate ? ` de ${dm(base.lastQuoteDate)}` : ''}`;
    helperTone = toneOf(resultTone(d), 'tertiary');
  } else {
    helper = `Valor anterior: ${money(base.current)}${base.lastQuoteDate ? ` em ${dm(base.lastQuoteDate)}` : ''}`;
  }
  const lowBalance = kind === 'contribution' && account && account.balance < v;

  const kinds: MovementKind[] = auto ? ['contribution', 'withdrawal', 'income'] : ['contribution', 'withdrawal', 'income', 'quote'];
  const ok = v > 0 && (!needsQty || qty !== null) && !blocked && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        kind,
        amount_cents: kind === 'income' && loss ? -v : v,
        quantity: needsQty ? qty : null,
        date,
        account_id: flow ? accountId : null,
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.form}>
      <SegmentedControl
        label="Tipo de movimento"
        options={kinds.map((k) => ({ value: k, label: MOVEMENT_LABELS[k] }))}
        value={kind}
        onChange={setKind}
      />
      {kind === 'income' && (
        <SegmentedControl
          label="Ganho ou perda"
          options={[
            { value: 'gain', label: 'Ganho' },
            { value: 'loss', label: 'Perda' },
          ]}
          value={loss ? 'loss' : 'gain'}
          onChange={(x) => setLoss(x === 'loss')}
        />
      )}
      <View style={s.valueBlock}>
        <MoneyField large label={VALUE_LABELS[kind]} cents={cents} onChange={setCents} />
        <Text variant="caption" tone={helperTone} numeric>
          {helper}
        </Text>
      </View>
      {needsQty && (
        <Input
          label={asset.kind === 'crypto' ? 'Quantidade' : 'Quantidade de cotas'}
          value={qtyText}
          onChangeText={setQtyText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          invalid={qtyText.trim() !== '' && qty === null}
          hint={qtyText.trim() !== '' && qty === null ? 'Use até 8 casas decimais.' : undefined}
        />
      )}
      <DateRow date={date} hint={relativeDay(date, today)} onChange={setDate} />
      {flow && accounts.length > 0 && (
        <View style={s.accounts}>
          <Text variant="label" tone="tertiary">
            {kind === 'contribution' ? 'Sai da conta (opcional)' : 'Volta para a conta (opcional)'}
          </Text>
          <View style={s.chips}>
            <Chip size="sm" label="Nenhuma" selected={accountId === null} onPress={() => setAccountId(null)} />
            {accounts.map(({ account: a }) => (
              <Chip key={a.id} size="sm" label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </View>
          {account && (
            <Text variant="caption" tone={lowBalance ? 'warning' : 'tertiary'} numeric>
              {lowBalance
                ? `Saldo do ${account.account.name} é ${balance(account.balance)}. A conta fica em ${balance(account.balance - v)}.`
                : `Saldo ${balance(account.balance)}`}
            </Text>
          )}
        </View>
      )}
      <Input label="Observação (opcional)" value={notes} onChangeText={setNotes} maxLength={MOVEMENT_NOTES_MAX} />
      <Button label="Salvar" fullWidth haptic disabled={!ok} loading={saving} onPress={() => void save()} />
      {editing && <Button label="Excluir movimento" variant="ghostDanger" fullWidth onPress={() => onDelete(editing)} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[3] + t.space[0.5] },
  valueBlock: { gap: t.space[1.5] },
  accounts: { gap: t.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
