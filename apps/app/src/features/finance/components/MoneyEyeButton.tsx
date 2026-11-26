import { Eye, EyeOff } from 'lucide-react-native';

import { useMoneyVisibility } from '@/shared/lib/MoneyVisibility';
import { IconButton } from '@/shared/ui';

/** Olhinho do topo de Finanças: esconde ou mostra os valores em dinheiro (a escolha fica salva no aparelho). */
export function MoneyEyeButton() {
  const { hidden, toggle } = useMoneyVisibility();
  return <IconButton icon={hidden ? EyeOff : Eye} label={hidden ? 'Mostrar valores' : 'Ocultar valores'} onPress={toggle} />;
}
