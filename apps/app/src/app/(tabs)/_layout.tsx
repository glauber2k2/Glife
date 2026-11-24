import { Tabs } from 'expo-router/js-tabs';
import { BookOpen, NotebookPen, Sun, Wallet } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';

import { createTabFocusTracker } from '@/shared/navigation/navigationMotion';
import { TabBar, tabIcon } from '@/shared/navigation/TabBar';
import { TabScene } from '@/shared/navigation/TabScene';

export default function TabsLayout() {
  const [tracker] = useState(createTabFocusTracker);
  const renderTabScene = useCallback(
    ({ children }: { children: ReactNode }) => <TabScene tracker={tracker}>{children}</TabScene>,
    [tracker],
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none' }}
      screenLayout={renderTabScene}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: tabIcon(Sun) }} />
      <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
      <Tabs.Screen name="financas" options={{ title: 'Finanças', tabBarIcon: tabIcon(Wallet) }} />
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia', tabBarIcon: tabIcon(BookOpen) }} />
    </Tabs>
  );
}
