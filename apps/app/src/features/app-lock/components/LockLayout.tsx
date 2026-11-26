import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot, Text, makeStyles, useTheme } from '@/shared/ui';

/**
 * Página inteira e opaca das telas do bloqueio: nada do app aparece por trás. Coluna de 400 px no web;
 * `footer` fica no pé da tela (ex.: "Esqueci a senha").
 */
export function LockLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const s = useStyles();
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.column}>
          {children}
          <View style={s.spacer} />
          {footer}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Cabeçalho das etapas de criar a senha e da oferta da biometria: marca pequena (mascote + Glife), sem "Voltar". */
export function LockHeader() {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.header} accessibilityRole="header" accessibilityLabel="Glife">
      <Mascot size={t.size.mascotSmall - t.space[1.5]} eyes={t.colors.bg} />
      <Text variant="wordmarkSmall">Glife</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter },
  column: { flex: 1, width: '100%', maxWidth: t.layout.authMaxWidth, alignSelf: 'center' },
  spacer: { flex: 1 },
  header: { height: t.layout.headerHeight, flexDirection: 'row', alignItems: 'center', gap: t.space[2.5], marginTop: t.space[2] },
}));
