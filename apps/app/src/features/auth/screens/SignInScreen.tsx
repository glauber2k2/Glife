import { normalizeEmail } from '@glife/domain/auth';
import { Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton, Input, Reveal, Text, makeStyles, useTheme } from '@/shared/ui';

import { AuthMessage } from '../components/AuthMessage';
import { AuthScreen } from '../components/AuthLayout';
import { useAuth } from '../hooks/AuthProvider';
import { authMessage } from '../hooks/messages';
import { useAuthAction } from '../hooks/useAuthAction';

/** Depois de "muitas tentativas", o botão espera antes de liberar outra. */
const RATE_LIMIT_COOLDOWN_MS = 60_000;

/** Etapa 1: e-mail e senha. Sem cadastro nem recuperação pública. */
export function SignInScreen() {
  const s = useStyles();
  const t = useTheme();
  const { service } = useAuth();
  const { busy, error, setError, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const blocked = error === 'rate_limited';

  useEffect(() => {
    if (!blocked) return;
    const timer = setTimeout(() => setError(null), RATE_LIMIT_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [blocked, setError]);

  // A mensagem some assim que um dos campos muda (exceto a espera por muitas tentativas).
  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (error && !blocked) setError(null);
  };

  const canSubmit = !!normalizeEmail(email) && password.length > 0 && !blocked;
  const submit = () => {
    if (canSubmit) void run(() => service.signIn(email, password));
  };

  return (
    <AuthScreen>
      <View style={s.brand}>
        <Text variant="wordmark" accessibilityRole="header">
          Glife
        </Text>
        <Text variant="small" tone="tertiary" style={s.tagline}>
          Organizador de vida
        </Text>
      </View>
      <View style={s.form}>
        <Reveal>
          <Input
            label="E-mail"
            value={email}
            onChangeText={edit(setEmail)}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="username"
            returnKeyType="next"
            invalid={error === 'invalid_credentials'}
          />
          <Input
            label="Senha"
            value={password}
            onChangeText={edit(setPassword)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            invalid={error === 'invalid_credentials'}
            trailing={
              <IconButton
                icon={showPassword ? EyeOff : Eye}
                label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                variant="ghost"
                size={t.touch.minTarget}
                color="textTertiary"
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />
          {error && <AuthMessage message={authMessage(error, 'signin')} />}
          <View style={s.action}>
            <Button
              label={busy ? 'Entrando' : 'Entrar'}
              onPress={submit}
              loading={busy}
              disabled={!canSubmit}
              fullWidth
            />
          </View>
        </Reveal>
      </View>
    </AuthScreen>
  );
}

const useStyles = makeStyles((t) => ({
  brand: { paddingTop: t.layout.authTop - t.space[6] },
  tagline: { marginTop: t.space[3] },
  form: { marginTop: t.space[12] + t.space[4], gap: t.space[4] },
  action: { marginTop: t.space[4] },
}));
