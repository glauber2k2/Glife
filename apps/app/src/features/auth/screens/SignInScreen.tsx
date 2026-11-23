import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Text, makeStyles } from '@/shared/ui';

import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/AuthProvider';
import { useAuthAction } from '../hooks/useAuthAction';

export function SignInScreen() {
  const s = useStyles();
  const { service } = useAuth();
  const { busy, error, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => run(() => service.signIn(email, password));

  return (
    <AuthLayout title="Entrar">
      <View style={s.fields}>
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      {error && (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <Button label="Entrar" onPress={submit} loading={busy} disabled={!email || !password} fullWidth />
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  fields: { gap: t.space[4] },
}));
