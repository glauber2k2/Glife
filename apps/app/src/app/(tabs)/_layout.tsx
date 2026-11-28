import { Tabs } from 'expo-router/js-tabs';
import { CalendarCheck, House, StickyNote, Wallet } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';

import { GlifeAiButton } from '@/features/ai';
import { createTabFocusTracker } from '@/shared/navigation/navigationMotion';
import { TabBar, tabIcon } from '@/shared/navigation/TabBar';
import { TabScene } from '@/shared/navigation/TabScene';
import { TopNav, useTopNavigation } from '@/shared/navigation/TopNav';

/** Abas do Cobalto: Início · Agenda · Glife IA (mascote, no centro) · Notas · Finanças. A conversa abre em /ia. */
export default function TabsLayout() {
  const [tracker] = useState(createTabFocusTracker);
  // Web largo: abas no topo (64 px); no Android e em janelas estreitas, a barra flutuante embaixo.
  const top = useTopNavigation();
  const renderTabScene = useCallback(
    ({ children, route, navigation }: { children: ReactNode; route: { key: string }; navigation: { getState(): { routes: { key: string }[] } } }) => (
      <TabScene tracker={tracker} index={navigation.getState().routes.findIndex((r) => r.key === route.key)}>
        {children}
      </TabScene>
    ),
    [tracker],
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none', tabBarPosition: top ? 'top' : 'bottom' }}
      screenLayout={renderTabScene}
      tabBar={(props) => (top ? <TopNav {...props} center={<GlifeAiButton placement="top" />} /> : <TabBar {...props} center={<GlifeAiButton />} />)}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: tabIcon(CalendarCheck) }} />
      <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(StickyNote) }} />
      <Tabs.Screen name="financas" options={{ title: 'Finanças', tabBarIcon: tabIcon(Wallet) }} />
    </Tabs>
  );
}
