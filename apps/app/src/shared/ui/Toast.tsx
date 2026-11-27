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

/** Mostra uma confirmação curta: cartão de tinta por 4 s, sobe com mola e esmaece. Uma por vez. */
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
  const spring = resolveSpring('emphasis', reduceMotion);
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
  const bottom = insets.bottom + (current.aboveTabBar ? t.size.tabBar + t.layout.tabBarBottom + t.space[4] : t.space[7]);

  return (
    // Toques controlados por uma View comum: no web, pointerEvents no Animated.View não é confiável.
    <View pointerEvents={toast ? 'box-none' : 'none'} style={[s.host, { bottom }]}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[s.pill, current.actionLabel ? s.pillWithAction : s.pillPlain, style]}
      >
        {current.icon && (
          <View style={s.icon}>
            <current.icon size={t.icon.small} strokeWidth={t.icon.strokeWidth} color={t.colors.inverseInk} />
          </View>
        )}
        <Text variant="small" style={s.message} numberOfLines={1}>
          {current.message}
        </Text>
        {current.actionLabel && (
          // Text com onPress: clique direto no web e toque nativo no Android. A altura do texto é a da área de toque
          // (entrelinha = altura), então o rótulo fica centrado e a pílula inteira da ação responde.
          <Text
            variant="small"
            accessibilityRole="button"
            onPress={onAction}
            suppressHighlighting
            numberOfLines={1}
            style={s.action}
          >
            {current.actionLabel}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: t.space[0], right: t.space[0], alignItems: 'center', paddingHorizontal: t.space[4] },
  // Cobalto: cartão de tinta r18 com sombra nível 2; a ação em azul claro.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.toast,
    paddingVertical: t.space[1],
    paddingLeft: t.space[4],
    borderRadius: t.radius.fieldLarge,
    backgroundColor: t.colors.inverse,
    boxShadow: t.colors.shadow.level2,
    maxWidth: t.layout.sheetMaxWidth,
    width: '100%',
  },
  /** sem ação, a folga da direita é igual à da esquerda; com ação, a pílula da ação fica a 4 px da borda */
  pillPlain: { paddingRight: t.space[4] },
  pillWithAction: { paddingRight: t.space[1] },
  icon: { height: t.type.small.lineHeight, justifyContent: 'center' },
  message: {
    color: t.colors.inverseInk,
    fontFamily: t.type.chip.font,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  action: {
    height: t.size.toast - 2 * t.space[1],
    lineHeight: t.size.toast - 2 * t.space[1],
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.full,
    overflow: 'hidden',
    color: t.colors.inverseAccent,
    fontFamily: t.type.button.font,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
}));
