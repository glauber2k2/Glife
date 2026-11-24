import { SecurityLink } from '@/features/app-lock';
import { AccountSection } from '@/features/auth';
import { SettingsScreen } from '@/features/settings';

// Composição na rota: Ajustes recebe as seções de conta e segurança sem depender dessas features.
export default function AjustesRoute() {
  return <SettingsScreen account={<AccountSection />} security={<SecurityLink />} />;
}
