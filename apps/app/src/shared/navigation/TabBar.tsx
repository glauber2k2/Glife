import { router, useFocusEffect } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, makeStyles, usePress, useReduceMotion, useTheme } from '@/shared/ui';

import { getTabIndicatorX, isTabBarHidden } from './navigationMotion';

/**
 * Ícone de aba no padrão do design system. Cada rota declara o seu:
 *   <Tabs.Screen name="notas" options={{ title: 'Notas', tabBarIcon: tabIcon(NotebookPen) }} />
 * Assim a TabBar não precisa conhecer as rotas (aberta a novas abas sem mudar aqui).
 */
export function tabIcon(icon: LucideIcon) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon icon={icon} color={focused ? 'tonalInk' : 'textTertiary'} />;
  }
  return TabIcon;
}

/**
 * Barra de abas flutuante do Cobalto: cartão r26 a 14 px das laterais e 20 px do rodapé, sombra de navegação,
 * cinco casas (duas abas, o botão central, duas abas). A pílula tonal da aba ativa desliza em 340 ms.
 * O botão central vem de fora (`center`, a rota monta o da Glife IA); sem ele, o + da captura.
 */
export function TabBar({ state, descriptors, navigateToTab, center }: BottomTabBarProps & { center?: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState<number>(0);
  // A tela pode esconder as abas (ex.: seleção múltipla nas Notas) com `tabBarStyle: { display: 'none' }`.
  if (isTabBarHidden(descriptors[state.routes[state.index]?.key ?? '']?.options)) return null;

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
    <View pointerEvents="box-none" style={[s.host, { bottom: t.layout.tabBarBottom + insets.bottom }]}>
      <View style={s.bar} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width - 2 * t.space[1])}>
        <Indicator index={state.index} tabCount={state.routes.length} barWidth={barWidth} />
        {tabs.slice(0, middle)}
        <View style={s.slot}>{center ?? <CaptureButton />}</View>
        {tabs.slice(middle)}
      </View>
    </View>
  );
}

/** O + cobalto (r18): gira 45° ao abrir a captura e volta quando a barra reaparece. */
function CaptureButton() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const press = usePress();
  const turn = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      turn.set(reduceMotion ? 0 : withSpring(0, t.spring.tap));
    }, [turn, reduceMotion, t]),
  );
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 45}deg` }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capturar"
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        if (!reduceMotion) turn.set(withSpring(1, t.spring.tap));
        router.push('/caixa-de-entrada');
      }}
    >
      <Animated.View style={[s.fab, press.style]}>
        <Animated.View style={iconStyle}>
          <Icon icon={Plus} size={t.icon.large} color="onAccent" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Indicator({ index, tabCount, barWidth }: { index: number; tabCount: number; barWidth: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const target = getTabIndicatorX(index, tabCount, barWidth, t.size.tabIndicatorWidth);
  const x = useSharedValue(target ?? 0);
  const previous = useRef({ index, barWidth });

  useLayoutEffect(() => {
    if (target === null) return;
    const before = previous.current;
    previous.current = { index, barWidth };
    if (reduceMotion || before.index === index || before.barWidth <= 0) {
      x.set(target);
      return;
    }
    const [a, b, c, d] = t.easing.standard;
    x.set(withTiming(target, { duration: t.motion.indicator, easing: Easing.bezier(a, b, c, d) }));
  }, [index, barWidth, target, reduceMotion, x, t]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  if (target === null) return null;
  return <Animated.View testID="tab-active-indicator" pointerEvents="none" accessible={false} style={[s.indicator, style]} />;
}

function Tab({ title, focused, icon, onPress }: { title: string; focused: boolean; icon: ReactNode; onPress: () => void }) {
  const s = useStyles();
  const press = usePress();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={title}
      style={s.slot}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[s.tab, press.style]}>
        <View style={s.iconBox}>{icon}</View>
        <Text variant="tab" tone={focused ? 'tonal' : 'tertiary'} style={focused && s.tabActive} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: t.layout.tabBarInset, right: t.layout.tabBarInset, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    height: t.size.tabBar,
    paddingHorizontal: t.space[1],
    borderRadius: t.radius.dialog,
    backgroundColor: t.colors.card,
    boxShadow: t.colors.shadow.nav,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: t.size.tabBar },
  tab: { alignItems: 'center', gap: t.space[0.5] + t.hairline },
  iconBox: { width: t.size.tabIndicatorWidth, height: t.size.tabIndicatorHeight, alignItems: 'center', justifyContent: 'center' },
  tabActive: { fontFamily: t.type.tag.font },
  indicator: {
    position: 'absolute',
    top: t.space[2.5],
    left: t.space[1],
    width: t.size.tabIndicatorWidth,
    height: t.size.tabIndicatorHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.tonal,
  },
  fab: {
    width: t.size.fab,
    height: t.size.fab,
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: t.colors.shadow.fab,
  },
}));
