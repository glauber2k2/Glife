import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, Text, makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

import { getTabIndicatorOffset } from './navigationMotion';

/**
 * Ícone de aba no padrão do design system. Cada rota declara o seu:
 *   <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
 * Assim a TabBar não precisa conhecer as rotas (aberta a novas abas sem mudar aqui).
 */
export function tabIcon(icon: LucideIcon) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon icon={icon} color={focused ? 'accentInk' : 'textTertiary'} />;
  }
  return TabIcon;
}

/** 70 px: quatro abas em volta de um + contornado; uma pílula suave desliza para trás da aba ativa. */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [barWidth, setBarWidth] = useState<number>(t.space[0]);
  const offset = getTabIndicatorOffset(state.index, state.routes.length, barWidth, t.size.tabPillWidth);
  const target = offset ?? t.space[0];
  const indicatorX = useSharedValue(target);
  const spring = resolveSpring('standard', reduceMotion);

  useLayoutEffect(() => {
    indicatorX.set(spring ? withSpring(target, spring) : target);
  }, [target, spring, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? target : indicatorX.get() }],
  }));

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const title = options?.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        aria-selected={focused}
        accessibilityLabel={title}
        style={s.tab}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
      >
        {options?.tabBarIcon?.({ focused, color: '', size: 0 })}
        <Text variant="tab" tone={focused ? 'accent' : 'tertiary'} style={focused && s.tabActive}>
          {title}
        </Text>
      </Pressable>
    );
  });

  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      <View style={s.inner} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {offset !== null && (
          <Animated.View
            testID="tab-active-indicator"
            pointerEvents="none"
            accessible={false}
            style={[s.indicator, indicatorStyle]}
          />
        )}
        {tabs.slice(0, middle)}
        <View style={s.tab}>
          <IconButton
            icon={Plus}
            label="Caixa de entrada"
            color="textSecondary"
            onPress={() => router.push('/caixa-de-entrada')}
          />
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
    height: t.size.tabBar,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space[1], height: t.size.tabBar },
  tabActive: { fontFamily: t.type.label.font },
  indicator: {
    position: 'absolute',
    left: t.space[0],
    top: (t.size.tabBar - t.size.tabPillHeight) / 2,
    width: t.size.tabPillWidth,
    height: t.size.tabPillHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.soft,
  },
}));
