// Criar a senha do app (protótipo "Glife Bloqueio", seção 02): logo depois do primeiro login, antes de qualquer
// tela. Sem "Voltar" nem "Pular". No Android com biometria cadastrada, a etapa seguinte oferece a digital.
import { APP_PASSWORD_MIN, enableBiometrics } from '@glife/domain/applock';
import { Check, Fingerprint } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Icon, Reveal, Text, makeStyles, useTheme } from '@/shared/ui';

import { LockHeader, LockLayout } from '../components/LockLayout';
import { LockMessage, LengthRule, PasswordInput } from '../components/PasswordParts';
import { useAppLock } from '../hooks/AppLockProvider';

export function CreatePasswordScreen({ onDone }: { onDone: () => void }) {
  const { bioAvailable } = useAppLock();
  const [step, setStep] = useState<'criar' | 'oferta'>('criar');
  const offer = Platform.OS !== 'web' && bioAvailable;
  if (step === 'oferta') return <OfferBiometrics onDone={onDone} />;
  return <CreateStep offer={offer} onCreated={() => (offer ? setStep('oferta') : onDone())} />;
}

function CreateStep({ offer, onCreated }: { offer: boolean; onCreated: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const { lock, refresh } = useAppLock();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const long = pwd.length >= APP_PASSWORD_MIN;
  // O erro aparece ao sair do campo de confirmação, não a cada letra; some assim que bater.
  const mismatch = confirmLeft && confirm.length > 0 && confirm !== pwd;
  const ready = long && confirm === pwd;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await lock.setPassword(pwd);
      await refresh();
      onCreated();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LockLayout>
      <LockHeader />
      <Reveal delay={t.motion.stepDelay}>
        <Text variant="title" accessibilityRole="header" style={s.title}>
          Crie a senha do app
        </Text>
        <Text tone="secondary" style={s.intro}>
          Ela desbloqueia o Glife só neste aparelho e é diferente da senha da conta e do PIN do celular. Se esquecer,
          será preciso entrar com a conta de novo.
        </Text>
        <View style={s.fields}>
          <PasswordInput label="Senha do app" value={pwd} onChangeText={setPwd} autoFocus returnKeyType="next" />
          <View style={s.field}>
            <PasswordInput
              label="Confirmar a senha"
              value={confirm}
              onChangeText={setConfirm}
              onBlur={() => setConfirmLeft(true)}
              invalid={mismatch}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
            {mismatch && <LockMessage kind="error">As senhas não são iguais.</LockMessage>}
          </View>
          <LengthRule value={pwd} />
          {failed && <LockMessage kind="error">Não foi possível guardar a senha. Tente de novo.</LockMessage>}
          <View style={s.action}>
            <Button
              label={offer ? 'Continuar' : 'Criar senha'}
              fullWidth
              loading={busy}
              disabled={!ready}
              onPress={() => void submit()}
            />
          </View>
        </View>
      </Reveal>
    </LockLayout>
  );
}

function OfferBiometrics({ onDone }: { onDone: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const { lock, bio, withSystemPrompt, refresh } = useAppLock();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      const outcome = await withSystemPrompt(() => enableBiometrics(lock, bio));
      await refresh();
      // Cancelou: fica aqui, para escolher de novo ou "Agora não".
      if (outcome === 'ok' || outcome === 'unavailable') onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <LockLayout
      footer={
        <Reveal delay={t.motion.stepDelay}>
          <View style={s.offerActions}>
            <Button label="Usar biometria" icon={Fingerprint} fullWidth loading={busy} onPress={() => void accept()} />
            <Button label="Agora não" variant="subtle" fullWidth onPress={onDone} />
            <Text variant="caption" tone="tertiary" align="center" style={s.later}>
              Dá para mudar depois em Ajustes › Segurança.
            </Text>
          </View>
        </Reveal>
      }
    >
      <LockHeader />
      <Reveal delay={t.motion.stepDelay}>
        <View style={s.created}>
          <Icon icon={Check} size={t.icon.small} color="success" />
          <Text variant="small" tone="success">
            Senha do app criada
          </Text>
        </View>
        <Text variant="title" accessibilityRole="header" style={s.offerTitle}>
          Desbloquear com a digital?
        </Text>
        <Text tone="secondary" style={s.intro}>
          É o jeito normal de abrir o Glife neste celular. Quando a biometria falhar ou for cancelada, ele pede a senha
          do app.
        </Text>
      </Reveal>
    </LockLayout>
  );
}

const useStyles = makeStyles((t) => ({
  title: { paddingTop: t.space[8] },
  intro: { marginTop: t.space[4] },
  fields: { marginTop: t.space[8], gap: t.space[4] },
  field: { gap: t.space[1.5] },
  action: { marginTop: t.space[4] },
  created: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingTop: t.space[8] },
  offerTitle: { marginTop: t.space[4] },
  offerActions: { gap: t.space[2], paddingBottom: t.space[4] },
  later: { marginTop: t.space[1] },
}));
