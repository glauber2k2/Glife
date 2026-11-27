// Barra flutuante dos versículos selecionados (protótipo `leitor`, estado "Versículos selecionados"): contagem, as
// 4 cores do marca-texto e fechar; embaixo, sublinhar, remover a marcação e as ações registradas (anotar, copiar…).
import { HIGHLIGHT_COLORS, type HighlightColor, type HighlightMark } from '@glife/domain/bible';
import { Check, Eraser, Underline, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, Text, makeStyles, usePress, useReduceMotion, useTheme } from '@/shared/ui';

import type { PassageAction } from './actions';

const COLOR_NAMES: Record<HighlightColor, string> = { yellow: 'amarelo', green: 'verde', blue: 'azul', pink: 'rosa' };

export interface PassageBarProps {
  count: number;
  /** marcação comum a todos os selecionados (null = nenhuma ou misturadas) */
  current: HighlightMark | null;
  anyMarked: boolean;
  busy: boolean;
  actions: readonly PassageAction[];
  onMark(mark: HighlightMark): void;
  onClear(): void;
  onAction(action: PassageAction): void;
  onClose(): void;
}

export function PassageBar({ count, current, anyMarked, busy, actions, onMark, onClear, onAction, onClose }: PassageBarProps) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const style = current?.style ?? 'highlight';
  const color = current?.color ?? 'yellow';
  return (
    <Animated.View
      pointerEvents="box-none"
      entering={reduceMotion ? undefined : FadeIn.duration(t.motion.standard)}
      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
      style={[s.host, { bottom: t.layout.tabBarBottom + insets.bottom }]}
    >
      <View style={s.bar} accessibilityRole="toolbar" accessibilityLabel="Ações nos versículos">
        <View style={s.top}>
          <Text variant="emphasis" style={s.count} numberOfLines={1}>
            {count} {count === 1 ? 'versículo' : 'versículos'}
          </Text>
          <View style={s.dots}>
            {HIGHLIGHT_COLORS.map((c) => {
              const on = current?.color === c;
              return (
                <Pressable
                  key={c}
                  disabled={busy}
                  onPress={() => onMark({ color: c, style })}
                  accessibilityRole="button"
                  accessibilityLabel={`${style === 'underline' ? 'Sublinhar' : 'Marca-texto'} ${COLOR_NAMES[c]}`}
                  accessibilityState={{ selected: on }}
                  style={[s.dot, { backgroundColor: style === 'underline' ? t.colors.highlightLine[c] : t.colors.highlight[c] }]}
                >
                  {/* check sempre reservado: marcar não muda o tamanho da bolinha */}
                  <View style={{ opacity: on ? t.opacity.full : t.opacity.hidden }}>
                    <Icon icon={Check} size={t.icon.small} color="text" />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <IconButton icon={X} label="Limpar seleção" variant="soft" size={t.size.iconButtonSmall} onPress={onClose} />
        </View>
        <View style={s.actions}>
          <BarButton
            label={style === 'underline' ? 'Marca-texto' : 'Sublinhar'}
            icon={Underline}
            disabled={busy}
            onPress={() => onMark({ color, style: style === 'underline' ? 'highlight' : 'underline' })}
          />
          <BarButton label="Remover" icon={Eraser} disabled={busy || !anyMarked} onPress={onClear} />
          {actions.map((a) => (
            <BarButton key={a.id} label={a.label} icon={a.icon} disabled={busy} onPress={() => onAction(a)} />
          ))}
        </View>
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
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    paddingHorizontal: t.space[3],
    paddingTop: t.space[3],
    paddingBottom: t.space[1],
    gap: t.space[1],
    borderRadius: t.radius.dialog,
    backgroundColor: t.colors.card,
    boxShadow: t.colors.shadow.nav,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  count: { flex: 1, paddingLeft: t.space[1] },
  dots: { flexDirection: 'row', gap: t.space[2] },
  dot: { width: t.size.colorDot, height: t.size.colorDot, borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  slot: { flex: 1, height: t.size.tabBar, alignItems: 'center', justifyContent: 'center' },
  button: { alignItems: 'center', gap: t.space[0.5] + t.hairline },
  disabled: { opacity: t.opacity.disabled },
}));
