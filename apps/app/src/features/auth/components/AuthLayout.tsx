import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Screen, makeStyles } from '@/shared/ui';

/** Coluna estreita e centrada para as telas de acesso. Prototipagem visual pendente. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <Screen eyebrow="Glife" title={title}>
      <View style={s.column}>{children}</View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  column: { width: '100%', maxWidth: t.layout.authMaxWidth, gap: t.space[6] },
}));
