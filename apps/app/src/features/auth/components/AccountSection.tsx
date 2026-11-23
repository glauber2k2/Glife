import { LogOut, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Icon, Text, makeStyles, useTheme } from '@/shared/ui';

import { useAuth } from '../hooks/AuthProvider';
import { authMessage } from '../hooks/messages';
import { useAuthAction } from '../hooks/useAuthAction';
import { AuthMessage } from './AuthMessage';

/** Conteúdo da seção Conta em Ajustes. "Sair deste aparelho" encerra só a sessão local, sem cor de alerta. */
export function AccountSection() {
  const s = useStyles();
  const t = useTheme();
  const { service, state } = useAuth();
  const { busy, error, run } = useAuthAction();
  return (
    <View>
      {state?.email && (
        <>
          <Text variant="small" tone="tertiary">
            Conectado como
          </Text>
          <Text variant="item" style={s.email}>
            {state.email}
          </Text>
        </>
      )}
      {state?.stage === 'ready' && (
        <View style={s.mfa}>
          <Icon icon={ShieldCheck} size={t.icon.tiny} color="textTertiary" />
          <Text variant="caption" tone="tertiary">
            Verificação em duas etapas ativa
          </Text>
        </View>
      )}
      <View style={s.action}>
        <Button
          label="Sair deste aparelho"
          variant="secondary"
          icon={LogOut}
          loading={busy}
          onPress={() => void run(() => service.signOut())}
        />
      </View>
      {error && <AuthMessage message={authMessage(error, 'account')} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  email: { marginTop: t.space[1] },
  mfa: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5], marginTop: t.space[3] },
  action: { marginTop: t.space[6], marginBottom: t.space[2] },
}));
