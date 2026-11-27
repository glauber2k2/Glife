// Linhas de Compras: lista (tela de listas) e item com caixa de marcar e risco animado (tela da lista).
import { itemTotal, type ShoppingItem } from '@glife/domain/finance';
import { Check, ChevronRight, Repeat, ShoppingBasket } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon, ModuleIcon, Text, makeStyles, resolveSpring, useInListGroup, useReduceMotion, useTheme } from '@/shared/ui';


import type { MoneyFormat } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';

/** Caixa de 22 px: o fundo vira destaque e o check cresce com a mola de toque. */
export function Checkbox({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const k = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    k.set(spring ? withSpring(checked ? 1 : 0, spring) : checked ? 1 : 0);
  }, [checked, spring, k]);
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: k.get() }] }));
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={t.space[3]}
      onPress={onPress}
      style={({ pressed }) => [s.box, checked && s.boxOn, pressed && s.boxPressed]}
    >
      <Animated.View style={mark}>
        <Icon icon={Check} size={t.icon.small - t.hairline} color="onAccent" />
      </Animated.View>
    </Pressable>
  );
}

/** Texto riscado da esquerda para a direita (300 ms). */
function Struck({ on, children }: { on: boolean; children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    k.set(reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: t.motion.standard }));
  }, [on, reduceMotion, k, t.motion.standard]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: k.get() }] }));
  return (
    <View style={s.struck}>
      {children}
      <Animated.View pointerEvents="none" style={[s.strike, style]} />
    </View>
  );
}

/** "2 × R$ 27,90", "1 un.", "3 un. · sem preço" ou o convite para preencher. */
export function itemMeta(item: Pick<ShoppingItem, 'quantity' | 'unit_price_cents'>, money: MoneyFormat['money']): { text: string; invite: boolean } {
  if (item.unit_price_cents !== null) {
    return { text: item.quantity > 1 ? `${item.quantity} × ${money(item.unit_price_cents)}` : '1 un.', invite: false };
  }
  return item.quantity > 1 ? { text: `${item.quantity} un. · sem preço`, invite: false } : { text: 'Adicionar qtd. e preço', invite: true };
}

export function ItemRow({
  item,
  checked,
  onToggle,
  onEdit,
  onMenu,
}: {
  item: ShoppingItem;
  /** marcado na tela (pode estar a caminho do carrinho) */
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMenu: () => void;
}) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const inGroup = useInListGroup();
  const t = useTheme();
  const total = itemTotal(item);
  const meta = itemMeta(item, money);
  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onMenu}
      accessibilityHint="Toque para editar; toque longo para mais ações"
      style={({ pressed }) => [s.itemRow, !inGroup && s.rowDivider, pressed && s.pressed]}
    >
      <View style={s.boxSlot}>
        <Checkbox checked={checked} label={item.name} onPress={onToggle} />
      </View>
      <View style={s.itemBody}>
        <View style={s.itemLine}>
          <View style={s.itemName}>
            <Struck on={checked}>
              <Text variant="item" tone={checked ? 'tertiary' : 'primary'}>
                {item.name}
              </Text>
            </Struck>
          </View>
          {total !== null && (
            <Text numeric style={s.medium} tone={checked ? 'tertiary' : 'primary'}>
              {money(total)}
            </Text>
          )}
        </View>
        <View style={s.metaLine}>
          <Text variant="caption" tone={meta.invite ? 'accent' : 'tertiary'} numeric>
            {meta.text}
          </Text>
          {item.always && (
            <View style={s.always}>
              <Icon icon={Repeat} size={t.icon.tiny - t.hairline} color="textTertiary" />
              <Text variant="caption" tone="tertiary">
                sempre
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ListRow({
  name,
  total,
  status,
  statusTone,
  last,
  onPress,
}: {
  name: string;
  total: string;
  status: string;
  statusTone: 'tertiary' | 'success';
  last: string;
  onPress: () => void;
}) {
  const s = useStyles();
  const inGroup = useInListGroup();
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.listRow, !inGroup && s.rowDivider, pressed && s.pressed]}>
      <ModuleIcon icon={ShoppingBasket} module="shopping" />
      <View style={s.listBody}>
        <View style={s.itemLine}>
          <Text variant="item" style={s.flex} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="amount" numeric>
            {total}
          </Text>
        </View>
        <View style={s.itemLine}>
          <Text variant="caption" tone={statusTone} style={s.flex}>
            {status}
          </Text>
          <Text variant="caption" tone="tertiary">
            {last}
          </Text>
        </View>
      </View>
      <Icon icon={ChevronRight} size={t.icon.small + t.space[0.5]} color="textQuaternary" />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  medium: { fontFamily: t.type.chip.font },
  pressed: { opacity: t.opacity.pressed },
  rowDivider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  box: {
    width: t.size.checkbox,
    height: t.size.checkbox,
    borderRadius: t.radius.checkbox,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  boxPressed: { transform: [{ scale: t.pressScale.pressedSmall }] },
  boxSlot: { paddingTop: t.hairline },
  struck: { flexShrink: 1, alignSelf: 'flex-start', justifyContent: 'center' },
  strike: {
    position: 'absolute',
    left: -t.space[0.5],
    right: -t.space[0.5],
    height: t.size.strike,
    backgroundColor: t.colors.textTertiary,
    transformOrigin: 'left center',
  },
  itemRow: {
    flexDirection: 'row',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3],
  },
  itemBody: { flex: 1, minWidth: 0, gap: t.space[1] },
  itemLine: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] },
  itemName: { flex: 1, minWidth: 0, flexDirection: 'row' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], flexWrap: 'wrap' },
  always: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3],
  },
  listBody: { flex: 1, minWidth: 0, gap: t.space[1] },
}));
