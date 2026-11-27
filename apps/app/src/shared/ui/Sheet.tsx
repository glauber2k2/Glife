import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SurfaceProvider } from './surface';
import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** véu claro: o que está atrás continua visível (ajustes com prévia ao vivo, como a leitura da Bíblia) */
  veil?: 'default' | 'light';
  children: ReactNode;
}

/** Folha inferior branca (r28 em cima, sombra nível 3): sobe em 400 ms e desce em 240 ms; véu sem desfoque. */
export function Sheet({ visible, onClose, title, subtitle, veil = 'default', children }: SheetProps) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const [x1, y1, x2, y2] = t.easing.enter;
  const [e1, f1, e2, f2] = t.easing.exit;
  const { height, width } = useWindowDimensions();
  // Web largo: janela centralizada de 560 px perto do topo, sem puxador.
  const wide = Platform.OS === 'web' && width >= t.layout.contentMaxWidth + 2 * t.layout.gutterWeb;
  const [presented, setPresented] = useState(visible);
  const transition = useRef(0);
  const hidden = t.opacity.hidden;
  const full = t.opacity.full;
  const fadeDuration = t.motion.standard;
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
      progress.set(spring ? withTiming(full, { duration: t.motion.sheetIn, easing: Easing.bezier(x1, y1, x2, y2) }) : full);
      scrimOpacity.set(spring ? withTiming(full, { duration: fadeDuration }) : full);
    } else if (!spring) {
      progress.set(hidden);
      scrimOpacity.set(hidden);
    } else {
      scrimOpacity.set(withTiming(hidden, { duration: t.motion.sheetOut }));
      progress.set(withTiming(hidden, { duration: t.motion.sheetOut, easing: Easing.bezier(e1, f1, e2, f2) }, (finished) => {
        if (finished) scheduleOnRN(finishClose, version);
      }));
    }
    return () => {
      cancelAnimation(progress);
      cancelAnimation(scrimOpacity);
    };
  }, [visible, spring, progress, scrimOpacity, full, hidden, fadeDuration, finishClose, t, x1, y1, x2, y2, e1, f1, e2, f2]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: wide ? progress.get() : full,
    transform: [{ translateY: reduceMotion ? hidden : (full - progress.get()) * (wide ? t.space[6] : sheetHeight.get()) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? (visible ? full : hidden) : scrimOpacity.get(),
  }));

  return (
    <Modal visible={visible || presented} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={[s.flex, wide && s.flexWide]} behavior="padding">
        <AnimatedPressable style={[s.scrim, veil === 'light' && s.scrimLight, scrimStyle]} onPress={onClose} accessibilityLabel="Fechar" />
        <Animated.View
          accessibilityViewIsModal
          onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
          style={[s.sheet, wide && s.sheetWide, { paddingBottom: t.space[6] + (wide ? t.space[0] : insets.bottom) }, sheetStyle]}
        >
          {!wide && <View style={s.grabber} />}
          {(title || subtitle) && (
            <View style={s.titles}>
              {title && <Text variant="heading">{title}</Text>}
              {subtitle && (
                <Text variant="small" tone="tertiary">
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          <SurfaceProvider value="card">{children}</SurfaceProvider>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, justifyContent: 'flex-end' },
  flexWide: { justifyContent: 'flex-start', paddingTop: t.layout.sheetTopWeb },
  scrim: {
    position: 'absolute',
    top: t.space[0], left: t.space[0], right: t.space[0], bottom: t.space[0],
    backgroundColor: t.colors.scrim,
  },
  scrimLight: { backgroundColor: t.colors.scrimLight },
  sheet: {
    backgroundColor: t.colors.card,
    boxShadow: t.colors.shadow.level3,
    maxHeight: '92%',
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    paddingTop: t.space[2] + t.space[0.5],
    paddingHorizontal: t.space[5],
    gap: t.space[3] + t.space[0.5],
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    alignSelf: 'center',
  },
  sheetWide: { borderRadius: t.radius.sheet, maxHeight: '86%', paddingTop: t.space[6] },
  grabber: {
    alignSelf: 'center',
    width: t.size.grabberWidth,
    height: t.size.grabberHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.border,
    marginBottom: t.space[1],
  },
  titles: { gap: t.space[1] },
}));
