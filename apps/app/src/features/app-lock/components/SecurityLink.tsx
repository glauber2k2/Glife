import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';

import { NavRow } from '@/shared/ui';

/** Linha de Ajustes que abre Segurança (bloqueio, biometria, senha do app). */
export function SecurityLink() {
  return <NavRow label="Bloqueio e senha do app" meta="Digital e tempo para bloquear" icon={Lock} onPress={() => router.push('/seguranca')} />;
}
