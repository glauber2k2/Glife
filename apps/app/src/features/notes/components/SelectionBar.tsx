// Barra flutuante da seleção múltipla (protótipo `notas`, estado "Seleção"): Mover · Tags · Fixar · Exportar · Lixeira.
// Fica no lugar da barra de abas, com a mesma sombra de navegação; sobe com esmaecer ao entrar na seleção.
import { FileDown, FolderInput, Pin, Tag as TagIcon, Trash2, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, makeStyles, usePress, useReduceMotion, useTheme } from '@/shared/ui';

export type BulkAction = 'move' | 'tags' | 'pin' | 'export' | 'trash';

const ACTIONS: { key: BulkAction; label: string; icon: LucideIcon }[] = [
  { key: 'move', label: 'Mover', icon: FolderInput },
  { key: 'tags', label: 'Tags', icon: TagIcon },
  { key: 'pin', label: 'Fixar', icon: Pin },
  { key: 'export', label: 'Exportar', icon: FileDown },
  { key: 'trash', label: 'Lixeira', icon: Trash2 },
];

export function SelectionBar({ disabled, onAction }: { disabled: boolean; onAction: (action: BulkAction) => void }) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      pointerEvents="box-none"
      entering={reduceMotion ? undefined : FadeIn.duration(t.motion.standard)}
      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
      style={[s.host, { bottom: t.layout.tabBarBottom + insets.bottom }]}
    >
      <View style={s.bar} accessibilityRole="toolbar">
        {ACTIONS.map((a) => (
          <BarButton key={a.key} label={a.label} icon={a.icon} disabled={disabled} onPress={() => onAction(a.key)} />
        ))}
      </View>
    </Animated.View>
  );
}

function BarButton({ label, icon, disabled, onPress }: { label: string; icon: LucideIcon; disabled: boolean; onPress: () => void }) {
  const s = useStyles();
  const press = usePress(disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={s.slot}
    >
      <Animated.View style={[s.button, disabled && s.disabled, press.style]}>
        <Icon icon={icon} color="textSecondary" />
        <Text variant="tab" tone="secondary" numberOfLines={1}>
          {label}
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
  slot: { flex: 1, height: t.size.tabBar, alignItems: 'center', justifyContent: 'center' },
  button: { alignItems: 'center', gap: t.space[0.5] + t.hairline },
  disabled: { opacity: t.opacity.disabled },
}));
