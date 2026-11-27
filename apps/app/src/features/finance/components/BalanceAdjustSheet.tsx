// Folha "Ajustar saldo" (protótipo `ajusteSaldo`): informa o saldo que o banco mostra; a diferença vira um
// lançamento "Ajuste de saldo", fora do orçamento. Diferença zero não grava nada. Só contas (cartão não tem saldo).
import { ADJUSTMENT_DESCRIPTION, balanceAdjustment, type Account } from '@glife/domain/finance';
import { Scale } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Button, Sheet, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useFinanceActions } from '../hooks/useFinanceActions';
import { failureReason } from './errors';
import { todayIso } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { MoneyField } from './ui';

export function BalanceAdjustSheet({
  account,
  currentCents,
  onClose,
  onAdjusted,
}: {
  /** null fecha a folha */
  account: Account | null;
  currentCents: number;
  onClose: () => void;
  onAdjusted: (accountId: string) => void;
}) {
  // Mantém a última conta durante a descida da folha.
  const [last, setLast] = useState<{ account: Account; current: number } | null>(null);
  if (account && (last?.account !== account || last.current !== currentCents)) setLast({ account, current: currentCents });
  const shown = account ? { account, current: currentCents } : last;
  return (
    <Sheet visible={!!account} onClose={onClose} title="Ajustar saldo" subtitle={shown?.account.name}>
      {shown && <AdjustForm key={shown.account.id} account={shown.account} current={shown.current} onClose={onClose} onAdjusted={onAdjusted} />}
    </Sheet>
  );
}

function AdjustForm({
  account,
  current,
  onClose,
  onAdjusted,
}: {
  account: Account;
  current: number;
  onClose: () => void;
  onAdjusted: (accountId: string) => void;
}) {
  const { signed, balance } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { adjustBalance } = useFinanceActions();
  const [cents, setCents] = useState<number | null>(Math.abs(current));
  const [negative, setNegative] = useState(current < 0);
  const [busy, setBusy] = useState(false);
  const bank = cents === null ? null : (negative ? -1 : 1) * cents;
  const diff = bank === null ? null : balanceAdjustment(current, bank);
  const diffCents = diff ? (diff.type === 'income' ? diff.amount_cents : -diff.amount_cents) : 0;

  const go = async () => {
    if (bank === null) return;
    if (!diff) {
      toast({ message: 'Saldo igual ao do banco. Nada a ajustar.' });
      onClose();
      return;
    }
    setBusy(true);
    try {
      const undo = await adjustBalance(account.id, bank, todayIso());
      onClose();
      if (!undo) {
        toast({ message: 'Saldo igual ao do banco. Nada a ajustar.' });
        return;
      }
      onAdjusted(account.id);
      toast({
        message: 'Saldo ajustado',
        icon: Scale,
        actionLabel: 'Desfazer',
        onAction: () =>
          void undo().catch((e: unknown) => {
            console.warn('Falha ao desfazer o ajuste', e);
            toast({ message: `Não foi possível desfazer o ajuste: ${failureReason(e)}` });
          }),
      });
    } catch (e) {
      console.warn('Falha ao ajustar o saldo', e);
      toast({ message: `Não foi possível ajustar: ${failureReason(e, 'confira o valor informado.')}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={s.line}>
        <Text variant="small" tone="tertiary">
          Saldo no Glife
        </Text>
        <Text variant="small" numeric style={s.strong}>
          {balance(current)}
        </Text>
      </View>
      <MoneyField
        label="Saldo que o banco mostra agora"
        cents={cents}
        onChange={setCents}
        allowNegative
        negative={negative}
        onNegativeChange={setNegative}
        hint="Pode ser negativo (digite − antes)."
      />
      <Alert tone={diff ? 'info' : 'neutral'}>
        {bank === null
          ? 'Informe o saldo do banco.'
          : diff
            ? `Diferença de ${signed(diffCents)} vira um lançamento “${ADJUSTMENT_DESCRIPTION}”. Não entra no orçamento.`
            : 'Saldo igual ao do banco. Nada a ajustar.'}
      </Alert>
      <View style={{ gap: t.space[1] }}>
        <Button label="Ajustar" fullWidth haptic disabled={bank === null} loading={busy} onPress={() => void go()} />
        <Button label="Cancelar" variant="subtle" fullWidth onPress={onClose} />
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space[3] },
  strong: { fontFamily: t.type.label.font },
}));
