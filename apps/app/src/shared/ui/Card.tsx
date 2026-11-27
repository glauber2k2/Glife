import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { SurfaceProvider } from './surface';
import { makeStyles, useTheme } from './theme';
import { usePress } from './usePress';

export interface CardProps {
  children: ReactNode;
  /** white (padrão) · tonal (IA, destaque calmo) · inverse (fatura, momentos de destaque) · soft (cartão dentro de cartão) */
  tone?: 'white' | 'tonal' | 'inverse' | 'soft';
  /** respiro interno: 18 (padrão), 16, 14 ou 0 */
  padding?: 'md' | 'sm' | 'tight' | 'none';
  /** espaço entre os filhos */
  gap?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Cartão do Cobalto: branco, r24, sem borda e sem sombra. Tocável afunda 0,96. */
export function Card({ children, tone = 'white', padding = 'md', gap, onPress, accessibilityLabel, style }: CardProps) {
  const s = useStyles();
  const press = usePress(!onPress);
  const body = (
    <SurfaceProvider value="card">
      <View style={[s.card, s[tone], s[padding], gap !== undefined && { gap }, !onPress && style]}>{children}</View>
    </SurfaceProvider>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={style}>
      <Animated.View style={press.style}>{body}</Animated.View>
    </Pressable>
  );
}

const ListGroupContext = createContext(false);

/** Linhas dentro de um ListGroup não desenham a própria divisória: o grupo desenha, recuada até o texto. */
export function useInListGroup() {
  return useContext(ListGroupContext);
}

export interface ListGroupProps {
  children: ReactNode;
  /** recuo da divisória: 52 quando as linhas têm ícone de 40 (padrão: detecta pela prop `icon`/`leading` do filho) */
  inset?: number;
  /** linhas com respiro lateral próprio (padding 0 no grupo): seleção que pinta a linha inteira */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Lista agrupada: um cartão com divisórias de 1 px recuadas até o texto. */
export function ListGroup({ children, inset, flush, style }: ListGroupProps) {
  const s = useStyles();
  const t = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <SurfaceProvider value="card">
      <ListGroupContext.Provider value>
        <View style={[s.group, flush && s.flush, style]}>
          {rows.map((row, i) => {
            const props = isValidElement(row) ? (row.props as { icon?: unknown; leading?: unknown; module?: unknown }) : {};
            const left = inset ?? (props.icon || props.leading || props.module ? t.size.rowInsetIcon : t.space[0]);
            return (
              <View key={isValidElement(row) && row.key != null ? row.key : i}>
                {i > 0 && <View style={[s.divider, { left: left + (flush ? t.space[4] : t.space[0]) }, flush && s.dividerFlush]} />}
                {row}
              </View>
            );
          })}
        </View>
      </ListGroupContext.Provider>
    </SurfaceProvider>
  );
}

const useStyles = makeStyles((t) => ({
  card: { borderRadius: t.radius.card },
  white: { backgroundColor: t.colors.card },
  tonal: { backgroundColor: t.colors.tonal },
  inverse: { backgroundColor: t.colors.inverse },
  soft: { backgroundColor: t.colors.bg },
  md: { padding: t.space[4.5] },
  sm: { padding: t.space[4] },
  tight: { padding: t.space[3.5] },
  none: { padding: t.space[0] },
  group: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.card,
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[4],
    overflow: 'hidden',
  },
  flush: { paddingHorizontal: t.space[0] },
  divider: { position: 'absolute', top: t.space[0], right: t.space[0], height: t.hairline, backgroundColor: t.colors.hairline, zIndex: 1 },
  dividerFlush: { right: t.space[4] },
}));
