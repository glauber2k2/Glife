import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BookOpen, NotebookPen, Plus, Sun, Wallet, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, makeStyles } from '@/shared/ui';

const ICONS: Record<string, LucideIcon> = {
  index: Sun,
  notas: NotebookPen,
  financas: Wallet,
  biblia: BookOpen,
};

/** Quatro abas e, no meio, um botão discreto para a caixa de entrada. */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const title = descriptors[route.key]?.options.title ?? route.name;
    const icon = ICONS[route.name] ?? Sun;
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
        <Icon icon={icon} color={focused ? 'accent' : 'textTertiary'} />
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
    maxWidth: 720,
    alignSelf: 'center',
    paddingVertical: t.space[2],
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: t.touch.minTarget },
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
