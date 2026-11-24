import { useState } from 'react';

import { Button, Sheet, Text } from '@/shared/ui';

import { useAppLock } from '../hooks/AppLockProvider';

/** "Esqueci a senha": confirma antes de sair da conta, porque o que não sincronizou se perde. */
export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { enterWithAccount } = useAppLock();
  const [busy, setBusy] = useState(false);
  const leave = async () => {
    setBusy(true);
    try {
      await enterWithAccount();
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Entrar com a conta?">
      <Text tone="secondary">
        O Glife sai deste aparelho. Depois de entrar com o e-mail, a senha da conta e o código do autenticador, você
        cria uma senha nova do app. O que ainda não sincronizou fica só neste aparelho e se perde.
      </Text>
      <Button label="Entrar com a conta" fullWidth loading={busy} onPress={() => void leave()} />
      <Button label="Cancelar" variant="ghost" fullWidth onPress={onClose} />
    </Sheet>
  );
}
