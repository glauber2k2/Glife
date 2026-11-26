import { normalizeTotpCode, type AuthErrorCode, type TotpEnrollment } from '@glife/domain/auth';
import * as Clipboard from 'expo-clipboard';
import { Check, CircleUser, Copy, RotateCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { Button, Card, Icon, Spinner, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { AuthBlock, AuthStep } from '../components/AuthLayout';
import { AuthMessage } from '../components/AuthMessage';
import { CodeField } from '../components/CodeField';
import { formatTotpSecret } from '../components/otp';
import { useAuth } from '../hooks/AuthProvider';
import { authMessage, errorCodeOf, type AuthContext } from '../hooks/messages';
import { useAuthAction } from '../hooks/useAuthAction';

/** Segunda etapa: cadastra o autenticador (primeira vez) ou pede o código. */
export function VerificationScreen() {
  const { state } = useAuth();
  return state?.stage === 'enroll_mfa' ? <EnrollTotp /> : <VerifyTotp />;
}

function VerifyTotp() {
  const s = useStyles();
  const t = useTheme();
  const { service, state } = useAuth();
  const action = useAuthAction();
  const confirm = (code: string) => action.run(() => service.verifyTotp(code));

  return (
    <AuthStep
      title="Código do autenticador"
      onSignOut={() => void action.run(() => service.signOut())}
      intro={
        <>
          <Text tone="tertiary">Abra o app autenticador e digite os 6 números do Glife.</Text>
          {state?.email && (
            <View style={s.account}>
              <Icon icon={CircleUser} size={t.icon.tiny} color="textTertiary" />
              <Text variant="caption" tone="tertiary">
                {state.email}
              </Text>
            </View>
          )}
        </>
      }
    >
      <CodeEntry context="verify" action={action} submitLabel={['Confirmar', 'Confirmando']} onSubmit={confirm} autoFocus />
    </AuthStep>
  );
}

function EnrollTotp() {
  const { service } = useAuth();
  const action = useAuthAction();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    service.startTotpEnrollment().then(
      (e) => active && setEnrollment(e),
      (e: unknown) => active && setFailure(errorCodeOf(e)),
    );
    return () => {
      active = false;
    };
  }, [service, attempt]);

  const retry = () => {
    setFailure(null);
    setAttempt((n) => n + 1);
  };
  const activate = (code: string) =>
    enrollment && action.run(() => service.confirmTotpEnrollment(enrollment.factorId, code));

  return (
    <AuthStep
      title="Ligue o app autenticador"
      onSignOut={() => void action.run(() => service.signOut())}
      intro={
        <Text tone="tertiary">
          O Glife exige verificação em duas etapas. Escaneie o código com o Google Authenticator, 1Password ou outro
          app de sua preferência e digite o código que ele mostrar.
        </Text>
      }
    >
      <QrBlock enrollment={enrollment} failure={failure} onRetry={retry} />
      <AuthBlock label="Digite o código" />
      <CodeEntry
        context="enroll"
        action={action}
        submitLabel={['Ativar verificação', 'Ativando']}
        onSubmit={(code) => void activate(code)}
        disabled={!enrollment}
      />
    </AuthStep>
  );
}

function QrBlock({
  enrollment,
  failure,
  onRetry,
}: {
  enrollment: TotpEnrollment | null;
  failure: AuthErrorCode | null;
  onRetry: () => void;
}) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), t.motion.toast);
    return () => clearTimeout(timer);
  }, [copied, t.motion.toast]);

  if (failure && !enrollment) {
    return (
      <View style={s.qrFailure}>
        <AuthMessage
          message={
            failure === 'network'
              ? authMessage('network', 'enroll')
              : { text: 'Não foi possível gerar o QR code.', tone: 'danger', icon: 'alert' }
          }
        />
        <Button label="Tentar de novo" variant="secondary" icon={RotateCw} onPress={onRetry} />
      </View>
    );
  }

  const fade = (delay: number) => (reduceMotion ? undefined : FadeIn.duration(t.motion.standard).delay(delay));
  const copy = async () => {
    if (!enrollment) return;
    await Clipboard.setStringAsync(enrollment.secret);
    setCopied(true);
  };

  return (
    <Card gap={t.space[4]} style={s.qrCard}>
      <View style={s.qrCenter}>
        {enrollment ? (
          <Animated.View entering={fade(0)} style={s.qrPaper} accessibilityLabel="QR code para o app autenticador">
            <SvgXml xml={enrollment.qrSvg} width={t.size.qrCode} height={t.size.qrCode} color={t.colors.qrInk} />
          </Animated.View>
        ) : (
          <View style={s.qrLoading}>
            <Spinner color="textTertiary" />
            <Text variant="caption" tone="tertiary">
              Preparando
            </Text>
          </View>
        )}
      </View>
      <View style={s.keyText}>
        <Text variant="micro" tone="tertiary" align="center">
          Ou digite a chave
        </Text>
        {enrollment ? (
          <Animated.View entering={fade(t.motion.stagger)}>
            <Text variant="mono" align="center" selectable accessibilityLabel={`Chave: ${enrollment.secret}`} style={s.key}>
              {formatTotpSecret(enrollment.secret).join(' ')}
            </Text>
          </Animated.View>
        ) : (
          <Text variant="small" tone="tertiary" align="center">
            Gerando chave
          </Text>
        )}
      </View>
      <Button
        label={copied ? 'Copiada' : 'Copiar'}
        variant="secondary"
        size="sm"
        selfAlign="center"
        icon={copied ? Check : Copy}
        disabled={!enrollment}
        onPress={() => void copy()}
      />
    </Card>
  );
}

/** Seis casas, mensagem e botão. Envia sozinho no 6º dígito; o botão fica para quem prefere confirmar. */
function CodeEntry({
  context,
  action,
  submitLabel: [idle, working],
  onSubmit,
  disabled,
  autoFocus,
}: {
  context: AuthContext;
  action: ReturnType<typeof useAuthAction>;
  submitLabel: [string, string];
  onSubmit: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const s = useStyles();
  const { busy, error, setError } = action;
  const [code, setCode] = useState('');
  const valid = normalizeTotpCode(code);
  const invalid = error === 'invalid_code';

  const submit = (value: string) => {
    if (!busy && normalizeTotpCode(value)) onSubmit(value);
  };

  return (
    <View style={s.codeEntry}>
      <CodeField
        value={code}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        onComplete={submit}
        invalid={invalid}
        disabled={disabled || busy}
        autoFocus={autoFocus}
      />
      {error && <AuthMessage message={authMessage(error, context)} />}
      <View style={s.action}>
        <Button
          label={busy ? working : idle}
          loading={busy}
          disabled={disabled || !valid}
          onPress={() => submit(code)}
          fullWidth
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  account: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  qrCard: { alignSelf: 'stretch' },
  qrCenter: { alignItems: 'center' },
  qrPaper: {
    width: t.size.qrBox,
    height: t.size.qrBox,
    padding: t.space[3],
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.qrPaper,
  },
  qrLoading: {
    width: t.size.qrBox,
    height: t.size.qrBox,
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[2],
  },
  qrFailure: { minHeight: t.size.qrBox, gap: t.space[4], alignItems: 'flex-start' },
  keyText: { gap: t.space[1.5] },
  key: { fontSize: t.type.item.fontSize, letterSpacing: t.type.label.letterSpacing },
  codeEntry: { gap: t.space[4] },
  action: { marginTop: t.space[2] },
}));
