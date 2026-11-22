import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/shared/navigation/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="notas" options={{ title: 'Notas' }} />
      <Tabs.Screen name="financas" options={{ title: 'Finanças' }} />
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia' }} />
    </Tabs>
  );
}
