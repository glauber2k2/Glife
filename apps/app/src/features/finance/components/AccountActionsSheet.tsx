// Folha "…" de uma conta ou cartão (protótipo `contaMais`): ajustar saldo (só conta), editar e arquivar.
import type { Account } from '@glife/domain/finance';
import { Archive, Pencil, Scale, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';

import { ListItem, ModuleIcon, Sheet } from '@/shared/ui';

export function AccountActionsSheet({
  account,
  onClose,
  onAdjust,
  onEdit,
  onArchive,
}: {
  /** null fecha a folha */
  account: Account | null;
  onClose: () => void;
  onAdjust: (account: Account) => void;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
}) {
  const [last, setLast] = useState<Account | null>(null);
  if (account && account !== last) setLast(account);
  const shown = account ?? last;
  const card = shown?.kind === 'credit_card';
  const lead = (icon: LucideIcon) => <ModuleIcon icon={icon} tone="neutral" size="sm" />;
  return (
    <Sheet visible={!!account} onClose={onClose} title={shown?.name}>
      {shown && (
        <>
          {!card && (
            <ListItem leading={lead(Scale)} title="Ajustar saldo" subtitle="Igualar ao saldo do banco" onPress={() => onAdjust(shown)} />
          )}
          <ListItem leading={lead(Pencil)} title={card ? 'Editar cartão' : 'Editar conta'} onPress={() => onEdit(shown)} />
          <ListItem
            leading={lead(Archive)}
            title={card ? 'Arquivar cartão' : 'Arquivar conta'}
            subtitle={card ? 'Some das escolhas; as faturas continuam' : 'Some das escolhas; o extrato continua'}
            separator={false}
            onPress={() => onArchive(shown)}
          />
        </>
      )}
    </Sheet>
  );
}
