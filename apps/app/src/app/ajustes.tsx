import { AccountSection } from '@/features/auth';
import { SettingsScreen } from '@/features/settings';

// Composição na rota: Ajustes recebe a seção de conta sem depender da feature de autenticação.
export default function AjustesRoute() {
  return <SettingsScreen account={<AccountSection />} />;
}
