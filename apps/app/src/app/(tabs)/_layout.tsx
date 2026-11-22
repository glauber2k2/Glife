import { Tabs } from 'expo-router/js-tabs';
import { BookOpen, NotebookPen, Sun, Wallet } from 'lucide-react-native';

import { TabBar, tabIcon } from '@/shared/navigation/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: tabIcon(Sun) }} />
      <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
      <Tabs.Screen name="financas" options={{ title: 'Finanças', tabBarIcon: tabIcon(Wallet) }} />
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia', tabBarIcon: tabIcon(BookOpen) }} />
    </Tabs>
  );
}
