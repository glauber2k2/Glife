import type { LucideIcon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface ToastOptions {
  message: string;
  icon?: LucideIcon;
  /** ação de uma palavra, ex.: "Desfazer" */
  actionLabel?: string;
  onAction?: () => void;
  /** acima da barra de abas (listas) ou junto ao fundo (editor) */
  aboveTabBar?: boolean;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

/** Mostra uma confirmação curta: pílula escura por 4 s, sobe 16 px e esmaece. Uma por vez. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTheme();

  const show = useCallback(
    (opts: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...opts, key: Date.now() });
      timer.current = setTimeout(() => setToast(null), t.motion.toastLong);
    },
    [t.motion.toastLong],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastView
        toast={toast}
        onAction={() => {
          toast?.onAction?.();
          dismiss();
        }}
      />
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onAction }: { toast: (ToastOptions & { key: number }) | null; onAction: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  const visible = useSharedValue(0);
  const [shown, setShown] = useState(toast);

  if (toast && toast !== shown) setShown(toast);

  useEffect(() => {
    const target = toast ? 1 : 0;
    visible.set(spring ? withSpring(target, spring) : target);
  }, [toast, spring, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ translateY: (1 - visible.get()) * t.space[4] }],
  }));

  const current = toast ?? shown;
  if (!current) return null;
  const bottom = insets.bottom + (current.aboveTabBar ? t.size.tabBar + t.space[4] + t.space[0.5] : t.space[6]);

  return (
    // Toques controlados por uma View comum: no web, pointerEvents no Animated.View não é confiável.
    <View pointerEvents={toast ? 'box-none' : 'none'} style={[s.host, { bottom }]}>
      <Animated.View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.pill, style]}>
        {current.icon && <current.icon size={t.icon.small} strokeWidth={t.icon.strokeWidth} color={t.colors.bg} />}
        <Text variant="small" style={s.message} numberOfLines={1}>
          {current.message}
        </Text>
        {current.actionLabel && (
          // Text com onPress: clique direto no web e toque nativo no Android.
          <Text
            variant="small"
            accessibilityRole="button"
            onPress={onAction}
            suppressHighlighting
            style={[s.action, s.actionText]}
          >
            {current.actionLabel}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: t.space[0], right: t.space[0], alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2] + t.space[0.5],
    minHeight: t.size.toast,
    paddingLeft: t.space[4],
    paddingRight: t.space[1.5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.text,
    maxWidth: t.layout.sheetMaxWidth,
  },
  message: { color: t.colors.bg, fontFamily: t.type.chip.font, flexShrink: 1 },
  action: {
    minHeight: t.size.toast - t.space[2] - t.space[0.5],
    paddingHorizontal: t.space[3],
    justifyContent: 'center',
    borderRadius: t.radius.full,
  },
  actionText: { color: t.colors.bg, fontFamily: t.type.button.font, textDecorationLine: 'underline' },
}));
