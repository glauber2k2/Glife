import { Tabs } from 'expo-router/js-tabs';
import { BookOpen, NotebookPen, Sun, Wallet } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { TabBar, tabIcon } from '@/shared/navigation/TabBar';
import { TabScene } from '@/shared/navigation/TabScene';

function renderTabScene({ children }: { children: ReactNode }) {
  return <TabScene>{children}</TabScene>;
}

export default function TabsLayout() {
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
