import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { makeStyles } from './theme';

export interface SectionProps {
  /** rótulo de 11 px em caixa alta */
  title?: string;
  /** ação à direita do rótulo */
  action?: ReactNode;
  /** linha de 1 px no topo (padrão: sim) */
  divider?: boolean;
  children: ReactNode;
}

/** Bloco de tela: rótulo pequeno, linha de 1 px no topo e 18 px de respiro. Nunca uma caixa. */
export function Section({ title, action, divider = true, children }: SectionProps) {
  const s = useStyles();
  return (
    <View style={[s.section, divider && s.divider]}>
      {(title || action) && (
        <View style={s.header}>
          {title ? (
            <Text variant="label" tone="tertiary" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}

export function Divider() {
  const s = useStyles();
  return <View style={s.rule} />;
}

/** Estado vazio: uma frase curta e uma ação, sem ilustração. */
export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const s = useStyles();
  return (
    <View style={s.empty}>
      <Text tone="tertiary">{message}</Text>
      {actionLabel && onAction && <Button label={actionLabel} variant="ghost" onPress={onAction} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.space[4], paddingTop: t.layout.blockGap },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space[3] },
  rule: { height: t.hairline, backgroundColor: t.colors.hairline, alignSelf: 'stretch' },
  empty: { gap: t.space[2], paddingVertical: t.space[4], alignItems: 'flex-start' },
}));
