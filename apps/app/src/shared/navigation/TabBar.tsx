import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, makeStyles } from '@/shared/ui';

/**
 * Ícone de aba no padrão do design system. Cada rota declara o seu:
 *   <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
 * Assim a TabBar não precisa conhecer as rotas (aberta a novas abas sem mudar aqui).
 */
export function tabIcon(icon: LucideIcon) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon icon={icon} color={focused ? 'accent' : 'textTertiary'} />;
  }
  return TabIcon;
}

/** Quatro abas e, no meio, um botão discreto para a caixa de entrada. */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const title = options?.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={title}
        style={s.tab}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
      >
        {options?.tabBarIcon?.({ focused, color: '', size: 0 })}
        <Text variant="caption" tone={focused ? 'accent' : 'tertiary'}>
          {title}
        </Text>
      </Pressable>
    );
  });

  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      <View style={s.inner}>
        {tabs.slice(0, middle)}
        <View style={s.tab}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Caixa de entrada"
            onPress={() => router.push('/caixa-de-entrada')}
            style={({ pressed }) => [s.inbox, pressed && s.inboxPressed]}
          >
            <Icon icon={Plus} color="onAccent" />
          </Pressable>
        </View>
        {tabs.slice(middle)}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    backgroundColor: t.colors.bg,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: t.layout.contentMaxWidth,
    alignSelf: 'center',
    paddingVertical: t.space[2],
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space[0.5], minHeight: t.touch.minTarget },
  inbox: {
    width: t.touch.minTarget,
    height: t.touch.minTarget,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxPressed: { backgroundColor: t.colors.accentPressed },
}));
