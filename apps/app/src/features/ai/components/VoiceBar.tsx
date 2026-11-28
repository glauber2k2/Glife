// Faixa do pedido por voz, acima da barra de abas: o texto ouvido ao vivo e, enquanto o dedo segura, o cadeado
// que sobe com o arraste; travada, mostra Cancelar e Enviar.
import { ArrowUp, ChevronUp, Lock, Mic, Trash2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Button, Icon, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

export interface VoiceBarProps {
  text: string;
  locked: boolean;
  /** 0..1 até travar */
  lockProgress: number;
  onCancel?: () => void;
  onSend?: () => void;
}

export function VoiceBar({ text, locked, lockProgress, onCancel, onSend }: VoiceBarProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  // ponto "ouvindo" pulsa devagar
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    const [a, b, c, d] = t.easing.loop;
    pulse.set(withRepeat(withTiming(t.opacity.muted, { duration: t.motion.float, easing: Easing.bezier(a, b, c, d) }), -1, true));
  }, [pulse, reduceMotion, t]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <View style={s.card} accessibilityLiveRegion="polite">
      <View style={s.top}>
        <Animated.View style={[s.dot, dotStyle]} />
        <Icon icon={Mic} size={t.icon.small} color="accentInk" />
        <Text variant="small" tone={text ? 'primary' : 'tertiary'} style={s.grow} numberOfLines={3}>
          {text || 'Ouvindo…'}
        </Text>
      </View>
      {locked ? (
        <View style={s.actions}>
          <Button label="Cancelar" icon={Trash2} variant="ghost" size="sm" onPress={onCancel} selfAlign="center" />
          <Button label="Enviar" icon={ArrowUp} size="sm" onPress={onSend} selfAlign="center" haptic />
        </View>
      ) : (
        <View style={s.hint}>
          <View style={[s.lock, { transform: [{ translateY: -lockProgress * t.space[3] }] }]}>
            <Icon icon={lockProgress > 0 ? Lock : ChevronUp} size={t.icon.small} color={lockProgress > 0 ? 'accentInk' : 'textTertiary'} />
          </View>
          <Text variant="caption" tone="tertiary" style={s.grow}>
            Solte para enviar · deslize para cima para travar
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    width: '100%',
    gap: t.space[3],
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[3],
    borderRadius: t.radius.card,
    backgroundColor: t.colors.card,
    boxShadow: t.colors.shadow.nav,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.size.tag },
  dot: { width: t.space[2], height: t.space[2], borderRadius: t.radius.full, backgroundColor: t.colors.danger },
  grow: { flex: 1 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  lock: { width: t.icon.small, alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: t.space[2] },
}));
