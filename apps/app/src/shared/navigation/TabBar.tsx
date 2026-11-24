import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, Text, makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

import { getTabDirection, getTabLineInsets, getTabLineMotion } from './navigationMotion';

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

/**
 * 70 px: quatro abas em volta de um + contornado. Um traço de 2 px no topo marca a aba ativa e estica
 * entre as abas: a borda da frente parte na mola de toque e a de trás segue na de ênfase.
 */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState<number>(0);

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const title = options?.title ?? route.name;
    return (
      <Tab
        key={route.key}
        title={title}
        focused={focused}
        icon={options?.tabBarIcon?.({ focused, color: '', size: 0 })}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
      />
    );
  });

  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      <View style={s.inner} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        <ActiveLine index={state.index} tabCount={state.routes.length} barWidth={barWidth} />
        {tabs.slice(0, middle)}
        <View style={s.slot}>
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

function ActiveLine({ index, tabCount, barWidth }: { index: number; tabCount: number; barWidth: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const insets = getTabLineInsets(index, tabCount, barWidth, t.layout.gutter);
  const left = useSharedValue(insets?.left ?? 0);
  const right = useSharedValue(insets?.right ?? 0);
  const previous = useRef({ index, barWidth });

  useLayoutEffect(() => {
    if (!insets) return;
    const before = previous.current;
    previous.current = { index, barWidth };
    const lead = resolveSpring('tap', reduceMotion);
    const trail = resolveSpring('emphasis', reduceMotion);
    // Mudou só a largura (ou ainda não havia medida): acompanha sem esticar.
    if (!lead || !trail || before.index === index || before.barWidth <= 0) {
      left.set(insets.left);
      right.set(insets.right);
      return;
    }
    const motion = getTabLineMotion(getTabDirection(before.index, index));
    const to = (edge: 'lead' | 'trail', value: number) =>
      edge === 'lead' ? withSpring(value, lead) : withDelay(t.motion.tabLineDelay, withSpring(value, trail));
    left.set(to(motion.left, insets.left));
    right.set(to(motion.right, insets.right));
  }, [index, barWidth, insets?.left, insets?.right, reduceMotion, left, right, t.motion.tabLineDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineStyle = useAnimatedStyle(() => ({ left: left.get(), right: right.get() }));

  if (!insets) return null;
  return (
    <Animated.View
      testID="tab-active-indicator"
      pointerEvents="none"
      accessible={false}
      style={[s.line, lineStyle]}
    />
  );
}

function Tab({ title, focused, icon, onPress }: { title: string; focused: boolean; icon: ReactNode; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const pressTo = (value: number) => scale.set(spring ? withSpring(value, spring) : t.pressScale.rest);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={title}
      style={s.slot}
      onPress={onPress}
      onPressIn={() => pressTo(t.pressScale.pressedSmall)}
      onPressOut={() => pressTo(t.pressScale.rest)}
    >
      <Animated.View style={[s.tab, pressStyle]}>
        {icon}
        <Text variant="tab" tone={focused ? 'accent' : 'tertiary'} style={focused && s.tabActive}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
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
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: t.size.tabBar },
  tab: { alignItems: 'center', gap: t.space[1] },
  tabActive: { fontFamily: t.type.label.font },
  /** sobe 1 px para cobrir a linha da borda superior */
  line: {
    position: 'absolute',
    top: -t.hairline,
    height: t.size.trackThin,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
  },
}));
