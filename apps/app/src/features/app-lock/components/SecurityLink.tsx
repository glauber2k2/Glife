import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';

import { NavRow } from '@/shared/ui';

/** Linha de Ajustes que abre Segurança (bloqueio, biometria, senha do app). */
export function SecurityLink() {
  return <NavRow label="Bloqueio e senha do app" icon={ShieldCheck} onPress={() => router.push('/seguranca')} divider={false} />;
}
