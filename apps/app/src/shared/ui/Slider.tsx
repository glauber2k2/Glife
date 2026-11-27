// Controle deslizante: trilho de 6, preenchimento cobalto e botão branco de 26 (área de toque de 44). Toque ou arraste
// em qualquer ponto do trilho; no web, setas do teclado; leitor de tela ajusta com incrementar/diminuir.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { snap, valueAt } from './sliderMath';
import { makeStyles, useTheme } from './theme';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  /** obrigatório: é o que o leitor de tela anuncia */
  label: string;
  /** texto do valor para o leitor de tela (ex.: "19 pixels") */
  valueText?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export function Slider({ value, min, max, step, onChange, label, valueText, startAdornment, endAdornment }: SliderProps) {
  const s = useStyles();
  const t = useTheme();
  const [width, setWidth] = useState(0);
  // último valor emitido: o arrasto dispara muitos eventos e só avisa quando o passo muda
  const last = useRef(value);
  useEffect(() => {
    last.current = value;
  }, [value]);
  const pct = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0;
  const knobLeft = pct * Math.max(0, width - t.size.sliderKnob);

  const emit = (next: number) => {
    if (next !== last.current) {
      last.current = next;
      onChange(next);
    }
  };
  const fromTouch = (e: GestureResponderEvent) => emit(valueAt(e.nativeEvent.locationX - t.size.sliderKnob / 2, width - t.size.sliderKnob, min, max, step));
  const nudge = (dir: 1 | -1) => emit(snap(value + dir * step, min, max, step));

  return (
    <View style={s.row}>
      {startAdornment}
      <View
        style={s.hit}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={fromTouch}
        onResponderMove={fromTouch}
        accessible
        focusable
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: valueText }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        // web: setas e Home/End
        {...({
          onKeyDown: (e: { key: string; preventDefault(): void }) => {
            const map: Record<string, () => void> = {
              ArrowRight: () => nudge(1),
              ArrowUp: () => nudge(1),
              ArrowLeft: () => nudge(-1),
              ArrowDown: () => nudge(-1),
              Home: () => emit(min),
              End: () => emit(max),
            };
            const fn = map[e.key];
            if (fn) {
              e.preventDefault();
              fn();
            }
          },
        } as object)}
      >
        <View pointerEvents="none" style={s.track}>
          <View style={[s.fill, { width: knobLeft + t.size.sliderKnob / 2 }]} />
        </View>
        <View pointerEvents="none" style={[s.knob, { left: knobLeft }]} />
      </View>
      {endAdornment}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  hit: { flex: 1, height: t.touch.minTarget, justifyContent: 'center' },
  track: { height: t.size.sliderTrack, borderRadius: t.radius.full, backgroundColor: t.colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: t.radius.full, backgroundColor: t.colors.accent },
  knob: {
    position: 'absolute',
    top: (t.touch.minTarget - t.size.sliderKnob) / 2,
    width: t.size.sliderKnob,
    height: t.size.sliderKnob,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.knob,
    boxShadow: t.colors.shadow.knob,
  },
}));
