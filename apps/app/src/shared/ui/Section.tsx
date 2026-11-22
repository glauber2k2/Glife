import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { makeStyles } from './theme';

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.section}>
      {title && (
        <Text variant="label" tone="tertiary">
          {title}
        </Text>
      )}
      <View>{children}</View>
    </View>
  );
}

export function Divider() {
  const s = useStyles();
  return <View style={s.divider} />;
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
  section: { gap: t.space[2] },
  divider: { height: t.hairline, backgroundColor: t.colors.hairline, alignSelf: 'stretch' },
  empty: { gap: t.space[2], paddingVertical: t.space[4], alignItems: 'flex-start' },
}));
