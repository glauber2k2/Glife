// Trocar a senha do app (protótipo "Glife Bloqueio", seção 03). Errar a atual conta no mesmo contador do
// bloqueio, para esta tela não servir de atalho para adivinhar. Ao salvar, volta com "Senha do app trocada".
import { APP_PASSWORD_MIN } from '@glife/domain/applock';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Button, Screen, Text, makeStyles, useToast } from '@/shared/ui';

import { AccountSheet } from '../components/AccountSheet';
import { LengthRule, LockMessage, PasswordInput } from '../components/PasswordParts';
import { useAppLock } from '../hooks/AppLockProvider';
import { formatClock, triesText } from '../hooks/lockText';

type Problem =
  | { kind: 'wrong'; failures: number }
  | { kind: 'wait'; remainingMs: number }
  | { kind: 'same' }
  | { kind: 'failed' };

export function ChangePasswordScreen() {
  const s = useStyles();
  const toast = useToast();
  const { lock, gate, refresh } = useAppLock();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const mismatch = confirmLeft && confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && next.length >= APP_PASSWORD_MIN && confirm === next;

  const save = async () => {
    if (!ready || busy) return;
    if (next === current) {
      setProblem({ kind: 'same' });
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const result = await lock.changePassword(current, next);
      await refresh();
      if (result.ok) {
        toast({ message: 'Senha do app trocada' });
        router.back();
        return;
      }
      if (result.reason === 'wrong') setProblem({ kind: 'wrong', failures: result.failures });
      else if (result.reason === 'wait') setProblem({ kind: 'wait', remainingMs: result.remainingMs });
      // 10º erro (ou já travado): a tela de bloqueio assume, pedindo a conta.
      else gate.lock();
    } catch {
      setProblem({ kind: 'failed' });
    } finally {
      setBusy(false);
    }
  };

  const currentWrong = problem?.kind === 'wrong' || problem?.kind === 'wait';

  return (
    <Screen header={<BackHeader title="Senha do app" backLabel="Segurança" fallback="/seguranca" />}>
      <View style={s.fields}>
        <View style={[s.field, !currentWrong && s.afterCurrent]}>
          <PasswordInput
            label="Senha atual"
            value={current}
            onChangeText={(v) => {
              setCurrent(v);
              if (problem?.kind === 'wrong') setProblem(null);
            }}
            invalid={currentWrong}
            autoFocus
            returnKeyType="next"
          />
          {problem?.kind === 'wrong' && (
            <LockMessage kind="error" sub={`Conta como erro de desbloqueio: ${triesText(problem.failures)}.`}>
              Senha atual incorreta.
            </LockMessage>
          )}
          {problem?.kind === 'wait' && (
            <LockMessage kind="wait">
              Muitas tentativas. Tente de novo em {formatClock(problem.remainingMs)}.
            </LockMessage>
          )}
        </View>
        <PasswordInput label="Nova senha" value={next} onChangeText={setNext} returnKeyType="next" />
        <View style={s.field}>
          <PasswordInput
            label="Confirmar a nova senha"
            value={confirm}
            onChangeText={setConfirm}
            onBlur={() => setConfirmLeft(true)}
            invalid={mismatch}
            returnKeyType="go"
            onSubmitEditing={() => void save()}
          />
          {mismatch && <LockMessage kind="error">As senhas não são iguais.</LockMessage>}
        </View>
        <LengthRule value={next} />
        <Text variant="caption" tone="tertiary">
          Vale só neste aparelho. No computador, a senha do app é outra.
        </Text>
        {problem?.kind === 'same' && (
          <LockMessage kind="error">A nova senha precisa ser diferente da atual.</LockMessage>
        )}
        {problem?.kind === 'failed' && (
          <LockMessage kind="error">Não foi possível trocar a senha. Tente de novo.</LockMessage>
        )}
        <View style={s.action}>
          <Button label="Trocar senha" fullWidth loading={busy} disabled={!ready} onPress={() => void save()} />
        </View>
        <View style={s.center}>
          <Button label="Esqueci a senha atual" variant="subtle" size="sm" onPress={() => setForgot(true)} />
        </View>
      </View>

      <AccountSheet visible={forgot} onClose={() => setForgot(false)} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  fields: { gap: t.space[4], marginTop: t.space[2] },
  field: { gap: t.space[1.5] },
  afterCurrent: { marginBottom: t.space[4] },
  action: { marginTop: t.space[4] },
  center: { alignItems: 'center' },
}));
