import { AtSign, LogOut, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, ListGroup, NavRow, Tag, makeStyles } from '@/shared/ui';

import { useAuth } from '../hooks/AuthProvider';
import { authMessage } from '../hooks/messages';
import { useAuthAction } from '../hooks/useAuthAction';
import { AuthMessage } from './AuthMessage';

/** E-mail mascarado: as duas primeiras letras e o domínio (a tela pode estar à vista de outras pessoas). */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** Conteúdo da seção Conta em Ajustes. "Sair deste aparelho" encerra só a sessão local, sem cor de alerta. */
export function AccountSection() {
  const s = useStyles();
  const { service, state } = useAuth();
  const { busy, error, run } = useAuthAction();
  return (
    <View style={s.root}>
      <ListGroup>
        {state?.email && <NavRow icon={AtSign} label="E-mail" meta={maskEmail(state.email)} />}
        {state?.stage === 'ready' && (
          <NavRow icon={ShieldCheck} label="Duas etapas" meta="Ligado · app autenticador" trailing={<Tag label="Ativo" tone="success" />} />
        )}
      </ListGroup>
      <Button
        label="Sair deste aparelho"
        variant="neutral"
        icon={LogOut}
        loading={busy}
        onPress={() => void run(() => service.signOut())}
      />
      {error && <AuthMessage message={authMessage(error, 'account')} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.space[3] },
}));
