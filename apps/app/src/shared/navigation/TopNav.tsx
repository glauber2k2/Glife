// Navegação no topo do web largo (protótipo "Glife Hoje", seção 4): marca à esquerda, as abas em texto e o + da
// caixa de entrada à direita, numa faixa de 64 px com linha embaixo e conteúdo alinhado à coluna de 720 px.
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus } from 'lucide-react-native';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';

import { IconButton, Text, makeStyles, useTheme } from '@/shared/ui';

/** Web com janela da largura da coluna ou maior: as abas vão para o topo. No Android e em telas estreitas, embaixo. */
export function useTopNavigation(): boolean {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= t.layout.contentMaxWidth + 2 * t.layout.gutter;
}

export function TopNav({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  return (
    <View style={s.bar} accessibilityRole="tablist">
      <View style={s.inner}>
        <Text variant="wordmarkSmall" style={s.brand}>
          Glife
        </Text>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const title = descriptors[route.key]?.options?.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              aria-selected={focused}
              accessibilityLabel={title}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [s.tab, (hovered || pressed) && s.hover, pressed && s.pressed]}
            >
              <Text variant="chip" tone={focused ? 'accent' : 'tertiary'} style={focused && s.active}>
                {title}
              </Text>
            </Pressable>
          );
        })}
        <IconButton icon={Plus} label="Caixa de entrada" color="textSecondary" onPress={() => router.push('/caixa-de-entrada')} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { backgroundColor: t.colors.bg, borderBottomWidth: t.hairline, borderBottomColor: t.colors.hairline },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    width: '100%',
    maxWidth: t.layout.contentMaxWidth + 2 * t.layout.gutter,
    alignSelf: 'center',
    height: t.size.topNav,
    paddingHorizontal: t.layout.gutter,
  },
  brand: { flex: 1 },
  tab: {
    height: t.size.pill,
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.full,
    justifyContent: 'center',
  },
  hover: { backgroundColor: t.colors.soft },
  pressed: { transform: [{ scale: t.pressScale.pressed }] },
  active: { fontFamily: t.type.button.font },
}));
