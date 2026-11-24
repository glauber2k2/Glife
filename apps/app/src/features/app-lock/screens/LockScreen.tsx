// Tela de bloqueio (protótipo "Glife Bloqueio", seção 01). Fundo opaco; no celular a biometria é pedida no
// primeiro quadro e a senha do app é a alternativa; no web, só a senha.
import { lockoutFor, tryBiometricUnlock, unlockWithPasswordAndRearm } from '@glife/domain/applock';
import * as Haptics from 'expo-haptics';
import { Fingerprint, Lock } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import {
  Button,
  Icon,
  Reveal,
  Text,
  makeStyles,
  shakeSteps,
  useReduceMotion,
  useTheme,
} from '@/shared/ui';

import { AccountSheet } from '../components/AccountSheet';
import { LockLayout } from '../components/LockLayout';
import { LockMessage, PasswordInput } from '../components/PasswordParts';
import { useAppLock } from '../hooks/AppLockProvider';
import { formatClock, lockPhase, triesText, waitNextText } from '../hooks/lockText';

const TICK_MS = 250;
const isWeb = Platform.OS === 'web';

/** Seleciona o que foi digitado: digitar de novo substitui (Android: setSelection; web: select). */
function selectAll(input: TextInput | null, length: number) {
  if (!input) return;
  input.focus();
  const el = input as unknown as { setSelection?: (a: number, b: number) => void; select?: () => void };
  if (el.setSelection) el.setSelection(0, length);
  else el.select?.();
}

export function LockScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { lock, bio, gate, status, broken, bioAvailable, refresh, withSystemPrompt, enterWithAccount } =
    useAppLock();
  // A tela só aparece com o status lido; se a biometria vale, a folha já está subindo.
  const [prompting, setPrompting] = useState(
    () => !isWeb && !!status?.biometrics && !status.mustUsePassword && !status.requireAccount && bioAvailable,
  );
  const [justFailed, setJustFailed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [forgot, setForgot] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  const phase = broken ? 'travado' : status ? lockPhase(status, now, justFailed) : 'senha';
  const canBio =
    !isWeb && !!status?.biometrics && !status.mustUsePassword && !status.requireAccount && bioAvailable && !broken;

  const verifyBiometrics = useCallback(
    () =>
      withSystemPrompt(() => tryBiometricUnlock(lock, bio)).then(async (attempt) => {
        if (attempt.kind === 'unlocked') return gate.unlock();
        await refresh();
        setPrompting(false);
      }),
    [withSystemPrompt, lock, bio, gate, refresh],
  );

  const askBiometrics = () => {
    setPrompting(true);
    void verifyBiometrics();
  };

  // A folha do sistema sobe sozinha, sem toque, uma vez por aparição da tela.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    if (prompting) void verifyBiometrics();
  }, [prompting, verifyBiometrics]);

  // Contagem calculada do prazo a cada 250 ms; ao zerar, o campo volta e recebe o foco.
  const waiting = phase === 'espera';
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    const input = inputRef.current;
    return () => {
      clearInterval(id);
      setTimeout(() => input?.focus(), 0);
    };
  }, [waiting]);

  const shake = () => {
    if (!isWeb) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (reduceMotion) return;
    const step = t.motion.shake / shakeSteps.length;
    shakeX.set(withSequence(...shakeSteps.map((x) => withTiming(x, { duration: step }))));
  };

  const submit = async () => {
    if (!pwd || busy || waiting) return;
    setBusy(true);
    try {
      const { result } = await withSystemPrompt(() => unlockWithPasswordAndRearm(lock, bio, pwd));
      if (result.ok) {
        setPwd('');
        gate.unlock();
        return;
      }
      if (result.reason === 'wrong') {
        shake();
        // Se começou uma espera, a contagem substitui a mensagem de erro (e ela não volta depois).
        setJustFailed(lockoutFor(result.failures).kind === 'none');
        // Começou uma espera ou travou: o campo esvazia; senão o texto fica selecionado.
        if (lockoutFor(result.failures).kind !== 'none') setPwd('');
        else selectAll(inputRef.current, pwd.length);
      }
      setNow(Date.now());
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await enterWithAccount();
    } finally {
      setLeaving(false);
      setForgot(false);
    }
  };

  const showForm = !prompting && phase !== 'travado';
  const remaining = status?.blockedUntil ? status.blockedUntil - now : 0;

  return (
    <LockLayout
      footer={
        showForm ? (
          <View style={s.footer}>
            <Button label="Esqueci a senha" variant="subtle" size="sm" onPress={() => setForgot(true)} />
          </View>
        ) : null
      }
    >
      <View style={s.brand}>
        <Text variant="display" accessibilityRole="header" accessibilityLabel="Glife">
          Glife
        </Text>
        <View style={s.locked}>
          <Icon icon={Lock} size={t.icon.small - t.space[0.5]} color="textTertiary" />
          <Text variant="small" tone="tertiary">
            Bloqueado
          </Text>
        </View>
      </View>

      {showForm && (
        <View style={s.form}>
          <Reveal>
            {phase === 'nova' && (
              <View style={s.nova}>
                <Icon icon={Fingerprint} size={t.icon.size} color="accentInk" />
                <View style={s.novaText}>
                  <Text variant="item">Digital nova no celular: confirme com a senha</Text>
                  <Text variant="small" tone="secondary">
                    Uma digital foi cadastrada neste celular desde o último desbloqueio. Depois da senha, a biometria
                    volta a valer.
                  </Text>
                </View>
              </View>
            )}
            <Animated.View style={shakeStyle}>
              <PasswordInput
                inputRef={inputRef}
                label="Senha do app"
                value={pwd}
                onChangeText={setPwd}
                invalid={phase === 'erro'}
                disabled={waiting}
                autoFocus={!canBio}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
            </Animated.View>
            {phase === 'erro' && status && (
              <LockMessage kind="error" sub={triesText(status.failures)}>
                Senha incorreta.
              </LockMessage>
            )}
            {waiting && status && (
              <LockMessage kind="wait" timer sub={waitNextText(status.failures)}>
                Muitas tentativas. Tente de novo em{' '}
                <Text variant="small" tone="warning" numeric style={s.clock}>
                  {formatClock(remaining)}
                </Text>
              </LockMessage>
            )}
            <View style={s.actions}>
              <Button
                label="Desbloquear"
                fullWidth
                loading={busy}
                disabled={!pwd || waiting}
                onPress={() => void submit()}
              />
              {canBio && (
                <Button
                  label="Usar biometria"
                  variant="ghost"
                  icon={Fingerprint}
                  fullWidth
                  onPress={askBiometrics}
                />
              )}
            </View>
          </Reveal>
        </View>
      )}

      {phase === 'travado' && (
        <View style={s.form}>
          <Reveal>
            <View style={s.lockedBlock}>
              <Text variant="label" tone="tertiary">
                Travado
              </Text>
              <Text variant="title2" style={s.lockedTitle}>
                Entre com a conta para liberar
              </Text>
              <Text tone="secondary" style={s.lockedText}>
                {broken
                  ? 'Não foi possível ler a senha do app neste aparelho. Entre com o e-mail, a senha da conta e o código do autenticador; depois disso você cria uma senha nova.'
                  : 'A senha do app foi digitada errado 10 vezes. Entre com o e-mail, a senha da conta e o código do autenticador; depois disso você cria uma senha nova.'}
              </Text>
              <View style={s.lockedAction}>
                <Button label="Entrar com a conta" fullWidth loading={leaving} onPress={() => void leave()} />
              </View>
            </View>
          </Reveal>
        </View>
      )}

      <AccountSheet visible={forgot} onClose={() => setForgot(false)} />
    </LockLayout>
  );
}

const useStyles = makeStyles((t) => ({
  brand: { paddingTop: t.layout.authTop },
  locked: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5], marginTop: t.space[3] },
  form: { marginTop: t.space[12] + t.space[4], gap: t.space[4] },
  nova: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start', paddingBottom: t.space[2] },
  novaText: { flex: 1, gap: t.space[1] },
  clock: { fontFamily: t.type.button.font },
  actions: { marginTop: t.space[4], gap: t.space[2] },
  footer: { alignItems: 'center', paddingBottom: t.space[4] },
  lockedBlock: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline, paddingTop: t.space[6] },
  lockedTitle: { marginTop: t.space[4] },
  lockedText: { marginTop: t.space[4] },
  lockedAction: { marginTop: t.space[8] },
}));
