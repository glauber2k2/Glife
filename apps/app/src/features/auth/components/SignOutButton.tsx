import { Button, Text } from '@/shared/ui';

import { useAuth } from '../hooks/AuthProvider';
import { useAuthAction } from '../hooks/useAuthAction';

/** Encerra a sessão neste aparelho. */
export function SignOutButton() {
  const { service, state } = useAuth();
  const { busy, error, run } = useAuthAction();
  return (
    <>
      {state?.email && <Text tone="secondary">Conectado como {state.email}</Text>}
      <Button label="Sair deste aparelho" variant="danger" loading={busy} onPress={() => run(() => service.signOut())} />
      {error && <Text tone="danger">{error}</Text>}
    </>
  );
}
