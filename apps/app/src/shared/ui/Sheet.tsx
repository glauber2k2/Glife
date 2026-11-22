import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Folha inferior simples. Separação por cor de superfície, sem sombra. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  const { height } = useWindowDimensions();
  const [presented, setPresented] = useState(visible);
  const transition = useRef(0);
  const hidden = t.opacity.hidden;
  const full = t.opacity.full;
  const fadeDuration = t.motion.base;
  const progress = useSharedValue<number>(hidden);
  const scrimOpacity = useSharedValue<number>(hidden);
  const sheetHeight = useSharedValue(height);

  // Mantém o modal montado só enquanto a saída precisa terminar.
  if (visible !== presented && (visible || reduceMotion)) setPresented(visible);

  const finishClose = useCallback((version: number) => {
    // Um fechamento já terminado não pode esconder uma folha reaberta.
    if (transition.current === version) setPresented(false);
  }, []);

  useEffect(() => {
    const version = ++transition.current;
    if (visible) {
      progress.set(spring ? withSpring(full, spring) : full);
      scrimOpacity.set(spring ? withTiming(full, { duration: fadeDuration }) : full);
    } else if (!spring) {
      progress.set(hidden);
      scrimOpacity.set(hidden);
    } else {
      scrimOpacity.set(withTiming(hidden, { duration: fadeDuration }));
      progress.set(withSpring(hidden, spring, (finished) => {
        if (finished) scheduleOnRN(finishClose, version);
      }));
    }
    return () => {
      cancelAnimation(progress);
      cancelAnimation(scrimOpacity);
    };
  }, [visible, spring, progress, scrimOpacity, full, hidden, fadeDuration, finishClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? hidden : (full - progress.get()) * sheetHeight.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? (visible ? full : hidden) : scrimOpacity.get(),
  }));

  return (
    <Modal visible={visible || presented} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AnimatedPressable style={[s.scrim, scrimStyle]} onPress={onClose} accessibilityLabel="Fechar" />
        <Animated.View
          accessibilityViewIsModal
          onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
          style={[s.sheet, { paddingBottom: t.space[6] + insets.bottom }, sheetStyle]}
        >
          <View style={s.grabber} />
          {title && <Text variant="heading">{title}</Text>}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: {
    position: 'absolute',
    top: t.space[0], left: t.space[0], right: t.space[0], bottom: t.space[0],
    backgroundColor: t.colors.scrim,
  },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    padding: t.space[6],
    gap: t.space[4],
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: t.size.grabberWidth,
    height: t.size.grabberHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.hairline,
    marginTop: -t.space[2],
  },
}));
