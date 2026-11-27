// Barra flutuante dos versículos selecionados (protótipo Bíblia v2), em três linhas que cabem em 360 dp:
// 1) referência dos versículos e fechar · 2) modo (marca-texto ou sublinhado) e as 4 cores · 3) Apagar (só com
// marcação) e as ações registradas (Anotar, Copiar…), cada uma com ícone e rótulo numa linha.
import { HIGHLIGHT_COLORS, type HighlightColor, type HighlightMark, type HighlightStyle } from '@glife/domain/bible';
import { Check, Eraser, Highlighter, Underline, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, Text, makeStyles, usePress, useReduceMotion, useTheme } from '@/shared/ui';

import type { PassageAction } from './actions';

const COLOR_NAMES: Record<HighlightColor, string> = { yellow: 'amarelo', green: 'verde', blue: 'azul', pink: 'rosa' };

export interface PassageBarProps {
  /** "Salmos 23:2–4" */
  refLabel: string;
  mode: HighlightStyle;
  onModeChange(mode: HighlightStyle): void;
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

export function PassageBar({ refLabel, mode, onModeChange, current, anyMarked, busy, actions, onMark, onClear, onAction, onClose }: PassageBarProps) {
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
      <View style={s.bar} accessibilityRole="toolbar" accessibilityLabel="Ações nos versículos">
        <View style={s.row}>
          <Text variant="emphasis" tone="inverse" style={s.ref} numberOfLines={1}>
            {refLabel}
          </Text>
          <IconButton icon={X} label="Limpar seleção" variant="onInverse" size={t.size.iconButtonSmall} onPress={onClose} />
        </View>
        <View style={[s.row, s.between]}>
          <View style={s.mode} accessibilityRole="radiogroup" accessibilityLabel="Tipo de marcação">
            <ModeButton icon={Highlighter} label="Marca-texto" on={mode === 'highlight'} onPress={() => onModeChange('highlight')} />
            <ModeButton icon={Underline} label="Sublinhado" on={mode === 'underline'} onPress={() => onModeChange('underline')} />
          </View>
          <View style={s.dots}>
            {HIGHLIGHT_COLORS.map((c) => {
              const on = current?.color === c && current.style === mode;
              return (
                <Pressable
                  key={c}
                  disabled={busy}
                  onPress={() => onMark({ color: c, style: mode })}
                  accessibilityRole="button"
                  accessibilityLabel={`${mode === 'underline' ? 'Sublinhar' : 'Grifar'} em ${COLOR_NAMES[c]}`}
                  accessibilityState={{ selected: on, disabled: busy }}
                  style={[s.dot, mode === 'underline' ? s.dotLine : { backgroundColor: t.colors.highlight[c] }]}
                >
                  {mode === 'underline' && <View style={[s.dotStroke, { backgroundColor: t.colors.highlightLine[c] }]} />}
                  {/* check sempre reservado: marcar não muda o tamanho da bolinha */}
                  <View style={[s.check, { opacity: on ? t.opacity.full : t.opacity.hidden }]}>
                    <Icon icon={Check} size={t.icon.small} color={mode === 'underline' ? 'inverseInk' : 'text'} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.row}>
          {actions.map((a) => (
            <BarButton key={a.id} label={a.label} icon={a.icon} disabled={busy} onPress={() => onAction(a)} />
          ))}
          {anyMarked && <BarButton label="Apagar" icon={Eraser} disabled={busy} onPress={onClear} />}
        </View>
      </View>
    </Animated.View>
  );
}

function ModeButton({ icon, label, on, onPress }: { icon: LucideIcon; label: string; on: boolean; onPress(): void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} style={[s.modeButton, on && s.modeOn]}>
      <Icon icon={icon} size={t.icon.blockSmall} color={on ? 'text' : 'inverseInk'} />
    </Pressable>
  );
}

function BarButton({ label, icon, disabled, onPress }: { label: string; icon: LucideIcon; disabled: boolean; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
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
        <Icon icon={icon} size={t.icon.blockSmall} color="inverseInk" />
        <Text variant="chip" tone="inverse" numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: t.space[3], right: t.space[3], alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    padding: t.space[2.5],
    gap: t.space[1.5],
    borderRadius: t.radius.card,
    backgroundColor: t.colors.inverse,
    boxShadow: t.colors.shadow.level2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  between: { justifyContent: 'space-between', paddingHorizontal: t.space[0.5] },
  ref: { flex: 1, paddingLeft: t.space[1.5] },
  mode: { flexDirection: 'row', padding: t.space[0.5] + t.hairline, borderRadius: t.radius.full, backgroundColor: t.colors.onInverseSoft },
  modeButton: { width: t.size.iconButtonSmall, height: t.size.pillSmall + t.space[1], borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: t.colors.inverseInk },
  dots: { flexDirection: 'row', gap: t.space[2.5] },
  dot: { width: t.size.colorDot, height: t.size.colorDot, borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  dotLine: { borderWidth: t.size.radioBorder, borderColor: t.colors.onInverseSoft },
  dotStroke: { position: 'absolute', left: t.space[2], right: t.space[2], bottom: t.space[2], height: t.size.underline + t.hairline, borderRadius: t.radius.full },
  check: { alignItems: 'center', justifyContent: 'center' },
  slot: { flex: 1, minWidth: t.space[0] },
  button: {
    height: t.size.buttonMedium - t.space[0.5],
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.onInverseSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[1.5],
    paddingHorizontal: t.space[2],
  },
  disabled: { opacity: t.opacity.disabled },
}));
