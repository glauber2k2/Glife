import { normalizeTotpCode, type TotpEnrollment } from '@glife/domain/auth';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Button, Text, makeStyles, useTheme } from '@/shared/ui';

import { AuthLayout } from '../components/AuthLayout';
import { CodeField } from '../components/CodeField';
import { useAuth } from '../hooks/AuthProvider';
import { authErrorMessage, useAuthAction } from '../hooks/useAuthAction';

/** Segunda etapa: cadastra o autenticador (primeira vez) ou pede o código. */
export function VerificationScreen() {
  const { state } = useAuth();
  return state?.stage === 'enroll_mfa' ? <EnrollTotp /> : <VerifyTotp />;
}

function VerifyTotp() {
  const { service, state } = useAuth();
  const { busy, error, run } = useAuthAction();
  const [code, setCode] = useState('');
  const submit = () => run(() => service.verifyTotp(code));

  return (
    <AuthLayout title="Verificação">
      <Text tone="secondary">
        Digite o código que aparece no seu app autenticador{state?.email ? ` para ${state.email}` : ''}.
      </Text>
      <CodeField value={code} onChange={setCode} onSubmit={submit} />
      {error && <Text tone="danger" accessibilityLiveRegion="polite">{error}</Text>}
      <Button label="Confirmar" onPress={submit} loading={busy} disabled={!normalizeTotpCode(code)} fullWidth />
      <Button label="Sair" variant="ghost" onPress={() => run(() => service.signOut())} />
    </AuthLayout>
  );
}

function EnrollTotp() {
  const s = useStyles();
  const t = useTheme();
  const { service } = useAuth();
  const { busy, error, setError, run } = useAuthAction();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState('');

  useEffect(() => {
    let active = true;
    service.startTotpEnrollment().then(
      (e) => active && setEnrollment(e),
      (e: unknown) => active && setError(authErrorMessage(e)),
    );
    return () => {
      active = false;
    };
  }, [service, setError, attempt]);

  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };
  const submit = () => enrollment && run(() => service.confirmTotpEnrollment(enrollment.factorId, code));

  return (
    <AuthLayout title="Proteja sua conta">
      <Text tone="secondary">
        O Glife exige verificação em duas etapas. Leia o QR code com um app autenticador (Google Authenticator,
        Microsoft Authenticator, 1Password…) e digite o código gerado.
      </Text>
      {enrollment ? (
        <View style={s.qrBlock}>
          <View style={s.qrPaper} accessibilityLabel="QR code para o app autenticador">
            <SvgXml xml={enrollment.qrSvg} width={t.size.qrCode} height={t.size.qrCode} color={t.colors.qrInk} />
          </View>
          <Text variant="caption" tone="tertiary">Sem câmera? Digite esta chave no autenticador:</Text>
          <Text selectable style={s.secret}>{enrollment.secret}</Text>
        </View>
      ) : (
        !error && <Text tone="tertiary">Preparando…</Text>
      )}
      <CodeField value={code} onChange={setCode} onSubmit={() => void submit()} />
      {error && <Text tone="danger" accessibilityLiveRegion="polite">{error}</Text>}
      <Button
        label="Ativar verificação"
        onPress={() => void submit()}
        loading={busy}
        disabled={!enrollment || !normalizeTotpCode(code)}
        fullWidth
      />
      {!enrollment && error && <Button label="Tentar de novo" variant="secondary" onPress={retry} />}
      <Button label="Sair" variant="ghost" onPress={() => run(() => service.signOut())} />
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  qrBlock: { alignItems: 'center', gap: t.space[3] },
  qrPaper: { padding: t.space[3], borderRadius: t.radius.card, backgroundColor: t.colors.qrPaper },
  secret: { letterSpacing: t.space[0.5], textAlign: 'center' },
}));
