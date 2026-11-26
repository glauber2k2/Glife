// Navegação no topo do web largo (Cobalto): mascote e marca à esquerda, abas em pílula no centro, busca (Ctrl+K)
// e o + da captura à direita, numa faixa de 64 px com linha embaixo.
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus, Search } from 'lucide-react-native';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';

import { Icon, Mascot, Text, makeStyles, useTheme } from '@/shared/ui';

/** Web com janela da largura da coluna ou maior: as abas vão para o topo. No Android e em telas estreitas, embaixo. */
export function useTopNavigation(): boolean {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= t.layout.contentMaxWidth + 2 * t.layout.gutterWeb;
}

export function TopNav({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.bar}>
      <View style={s.brand}>
        <Mascot size={t.size.tag + t.space[0.5]} eyes={t.colors.bg} />
        <Text variant="wordmarkSmall" style={s.brandText}>
          Glife
        </Text>
      </View>
      <View style={s.tabs} accessibilityRole="tablist">
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
              style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
                s.tab,
                (hovered || focused) && s.tabOn,
                focused && s.tabActive,
                pressed && s.pressed,
              ]}
            >
              <Text variant="chip" tone={focused ? 'primary' : 'secondary'} style={focused && s.activeText}>
                {title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="search" accessibilityLabel="Buscar (Ctrl K)" onPress={() => router.push('/busca')} style={s.search}>
        <Icon icon={Search} size={t.icon.small + t.space[0.5]} color="textTertiary" />
        <Text variant="small" tone="tertiary" style={s.grow}>
          Buscar
        </Text>
        <View style={s.kbd}>
          <Text variant="mono" tone="tertiary">
            Ctrl K
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Capturar"
        onPress={() => router.push('/caixa-de-entrada')}
        style={({ pressed }) => [s.plus, pressed && s.plusPressed]}
      >
        <Icon icon={Plus} color="onAccent" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[4],
    height: t.size.topNav,
    paddingHorizontal: t.layout.gutterWeb,
    backgroundColor: t.colors.bg,
    borderBottomWidth: t.hairline,
    borderBottomColor: t.colors.hairline,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  brandText: { fontSize: t.type.wordmarkSmall.fontSize - t.space[0.5] - t.hairline },
  tabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: t.space[1] },
  tab: { height: t.size.buttonSmall, paddingHorizontal: t.space[3.5], borderRadius: t.radius.full, justifyContent: 'center' },
  tabOn: { backgroundColor: t.colors.card },
  tabActive: { boxShadow: t.colors.shadow.segment },
  pressed: { transform: [{ scale: t.pressScale.pressed }] },
  activeText: { fontFamily: t.type.tag.font },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    height: t.size.buttonSmall + t.space[1],
    width: t.size.menuWidth,
    paddingLeft: t.space[3.5],
    paddingRight: t.space[2],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.card,
  },
  grow: { flex: 1 },
  kbd: { paddingHorizontal: t.space[1.5], borderRadius: t.radius.checkbox, backgroundColor: t.colors.bg },
  plus: {
    width: t.size.buttonSmall + t.space[1],
    height: t.size.buttonSmall + t.space[1],
    borderRadius: t.radius.segmentTrack,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: t.colors.shadow.fab,
  },
  plusPressed: { backgroundColor: t.colors.accentPressed, transform: [{ scale: t.pressScale.pressed }] },
}));
