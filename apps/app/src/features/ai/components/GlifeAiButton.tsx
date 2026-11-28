// Botão da Glife IA no centro da barra (mascote): toque abre o compositor; segurar pede por voz e soltar envia;
// segurar e arrastar para cima trava, e só "Enviar" envia. As regras do gesto estão em holdGesture.ts.
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot, makeStyles, usePress, useTheme, useToast } from '@/shared/ui';

import { startVoice, type VoiceSession } from '../data/speech';
import { AiComposer, askGlifeAi } from './AiComposer';
import { HOLD_MS, holdStep, type HoldEffect, type HoldEvent, type HoldState } from './holdGesture';
import { VoiceBar } from './VoiceBar';

const tap = () => {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** `top`: no topo do web largo (a faixa de voz abre para baixo). */
export function GlifeAiButton({ placement = 'bottom' }: { placement?: 'bottom' | 'top' }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const press = usePress();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [composer, setComposer] = useState(false);
  const [state, setState] = useState<HoldState>({ phase: 'idle' });
  const [heard, setHeard] = useState('');
  const [slotWidth, setSlotWidth] = useState(0);
  const current = useRef<HoldState>({ phase: 'idle' });
  const session = useRef<Promise<VoiceSession | null> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    (effect: HoldEffect) => {
      switch (effect) {
        case 'openComposer':
          setComposer(true);
          return;
        case 'startVoice':
          tap();
          setHeard('');
          session.current = startVoice(setHeard, (message) => toast({ message, aboveTabBar: true })).then((r) => {
            if (r.session) return r.session;
            // sem voz: volta ao repouso e oferece o texto
            current.current = { phase: 'idle' };
            setState(current.current);
            toast({
              message: r.status === 'denied' ? 'Sem acesso ao microfone. Digite o pedido.' : 'Pedido por voz indisponível aqui. Digite o pedido.',
              aboveTabBar: true,
            });
            setComposer(true);
            return null;
          });
          return;
        case 'lock':
          tap();
          return;
        case 'sendVoice': {
          const pending = session.current;
          session.current = null;
          void pending?.then(async (v) => {
            if (!v) return;
            const text = await v.finish();
            if (text.trim()) {
              tap();
              askGlifeAi(text);
            } else toast({ message: 'Não ouvi nada. Segure e fale, ou toque para digitar.', aboveTabBar: true });
          });
          return;
        }
        case 'cancelVoice': {
          const pending = session.current;
          session.current = null;
          void pending?.then((v) => v?.cancel());
        }
      }
    },
    [toast],
  );

  const dispatch = useCallback(
    (event: HoldEvent) => {
      const r = holdStep(current.current, event);
      current.current = r.state;
      setState(r.state);
      if (r.effect) run(r.effect);
    },
    [run],
  );

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => {
    clearTimer();
    void session.current?.then((v) => v?.cancel());
  }, []);

  // Toques pelo sistema de responder da View (funciona no Android e no web). Tempo pelo relógio do toque.
  const startY = useRef(0);
  const touch = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      const at = e.nativeEvent.timestamp;
      startY.current = e.nativeEvent.pageY;
      press.onPressIn();
      dispatch({ type: 'down', at });
      timer.current = setTimeout(() => dispatch({ type: 'tick', at: at + HOLD_MS }), HOLD_MS);
    },
    onResponderMove: (e: GestureResponderEvent) => dispatch({ type: 'move', dy: e.nativeEvent.pageY - startY.current }),
    onResponderRelease: (e: GestureResponderEvent) => {
      clearTimer();
      press.onPressOut();
      dispatch({ type: 'up', at: e.nativeEvent.timestamp });
    },
    onResponderTerminate: () => {
      clearTimer();
      press.onPressOut();
      dispatch({ type: 'cancel' });
    },
  };

  const recording = state.phase === 'recording';
  const locked = state.phase === 'locked';
  const barWidth = Math.min(width - 2 * t.layout.tabBarInset, t.layout.sheetMaxWidth);
  const lifted = t.size.tabBar + t.space[3];
  const top = placement === 'top';
  // posição da faixa: acima da barra flutuante (celular) ou abaixo da barra do topo (web largo)
  const floatPos = top ? { top: t.size.fab + t.space[3] } : { bottom: lifted - (t.size.tabBar - t.size.fab) / 2 };
  const lockedPos = top ? { top: insets.top + t.size.topNav + t.space[3] } : { bottom: insets.bottom + t.layout.tabBarBottom + lifted };

  return (
    <View style={s.slot} onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width)}>
      {recording && (
        // Enquanto o dedo segura: só mostra (os toques continuam no botão).
        <View pointerEvents="none" style={[s.float, { width: barWidth, left: (slotWidth - barWidth) / 2, ...floatPos }]}>
          <VoiceBar text={heard} locked={false} lockProgress={state.lockProgress} />
        </View>
      )}
      <View
        {...touch}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Glife IA"
        accessibilityHint="Toque para digitar um pedido; segure para pedir por voz"
        onAccessibilityTap={() => setComposer(true)}
      >
        <Animated.View style={[s.fab, press.style]}>
          <Mascot size={t.size.fab - t.space[4]} color={t.colors.onAccent} />
        </Animated.View>
      </View>

      <Modal visible={locked} transparent animationType="fade" onRequestClose={() => dispatch({ type: 'cancel' })}>
        <View style={s.modal}>
          <View style={[s.lockedBar, { width: barWidth, ...lockedPos }]}>
            <VoiceBar text={heard} locked lockProgress={1} onCancel={() => dispatch({ type: 'cancel' })} onSend={() => dispatch({ type: 'send' })} />
          </View>
        </View>
      </Modal>

      <AiComposer visible={composer} onClose={() => setComposer(false)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  slot: { alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: t.size.fab,
    height: t.size.fab,
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: t.colors.shadow.fab,
  },
  float: { position: 'absolute' },
  modal: { flex: 1, alignItems: 'center' },
  lockedBar: { position: 'absolute' },
}));
