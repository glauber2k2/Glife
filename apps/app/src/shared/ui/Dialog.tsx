import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SurfaceProvider } from './surface';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** botões (normalmente dois, lado a lado, com `grow`) */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Diálogo central r26 com sombra nível 3: entra com pop (0,92 → 1) e véu. */
export function Dialog({ visible, onClose, title, message, actions, children }: DialogProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(visible);
  const p = useSharedValue(0);
  if (visible && !shown) setShown(true);

  useEffect(() => {
    const [a, b, c, d] = t.easing.exit;
    if (visible) p.set(reduceMotion ? withTiming(1, { duration: t.motion.reduced }) : withSpring(1, t.spring.emphasis));
    else {
      p.set(withTiming(0, { duration: reduceMotion ? t.motion.reduced : t.motion.sheetOut, easing: Easing.bezier(a, b, c, d) }));
      const id = setTimeout(() => setShown(false), reduceMotion ? t.motion.reduced : t.motion.sheetOut);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [visible, p, reduceMotion, t]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get()),
    transform: [{ scale: reduceMotion ? 1 : t.pressScale.pop + (1 - t.pressScale.pop) * p.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, p.get()) }));

  return (
    <Modal visible={visible || shown} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <Animated.View style={[s.scrim, scrimStyle]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Fechar" />
        </Animated.View>
        <Animated.View style={[s.box, boxStyle]} accessibilityViewIsModal>
          <SurfaceProvider value="card">
            <Text variant="title2" accessibilityRole="header">
              {title}
            </Text>
            {message && (
              <Text variant="body" tone="secondary">
                {message}
              </Text>
            )}
            {children}
            {actions && <View style={s.actions}>{actions}</View>}
          </SurfaceProvider>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: t.space[6] },
  scrim: { position: 'absolute', top: t.space[0], left: t.space[0], right: t.space[0], bottom: t.space[0], backgroundColor: t.colors.scrim },
  fill: { flex: 1 },
  box: {
    width: '100%',
    maxWidth: t.layout.authMaxWidth,
    backgroundColor: t.colors.card,
    borderRadius: t.radius.dialog,
    padding: t.space[5] + t.space[0.5],
    gap: t.space[3.5],
    boxShadow: t.colors.shadow.level3,
  },
  actions: { flexDirection: 'row', gap: t.space[2.5], marginTop: t.space[1] },
}));
