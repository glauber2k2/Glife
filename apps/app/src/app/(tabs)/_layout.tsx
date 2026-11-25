import { Tabs } from 'expo-router/js-tabs';
import { BookOpen, NotebookPen, Sun, Wallet } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';

import { createTabFocusTracker } from '@/shared/navigation/navigationMotion';
import { TabBar, tabIcon } from '@/shared/navigation/TabBar';
import { TabScene } from '@/shared/navigation/TabScene';
import { TopNav, useTopNavigation } from '@/shared/navigation/TopNav';

export default function TabsLayout() {
  const [tracker] = useState(createTabFocusTracker);
  // Web largo: abas no topo (64 px); no Android e em janelas estreitas, a barra de baixo.
  const top = useTopNavigation();
  const renderTabScene = useCallback(
    ({ children }: { children: ReactNode }) => <TabScene tracker={tracker}>{children}</TabScene>,
    [tracker],
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none', tabBarPosition: top ? 'top' : 'bottom' }}
      screenLayout={renderTabScene}
      tabBar={(props) => (top ? <TopNav {...props} /> : <TabBar {...props} />)}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: tabIcon(Sun) }} />
      <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
      <Tabs.Screen name="financas" options={{ title: 'Finanças', tabBarIcon: tabIcon(Wallet) }} />
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia', tabBarIcon: tabIcon(BookOpen) }} />
    </Tabs>
  );
}
