import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, makeStyles } from '@/shared/ui';

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

/** Cabeçalho das etapas de criar a senha e da oferta da biometria: wordmark pequeno, sem "Voltar". */
export function LockHeader() {
  const s = useStyles();
  return (
    <View style={s.header}>
      <Text variant="wordmarkSmall" accessibilityRole="header" accessibilityLabel="Glife">
        Glife
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter },
  column: { flex: 1, width: '100%', maxWidth: t.layout.authMaxWidth, alignSelf: 'center' },
  spacer: { flex: 1 },
  header: { height: t.layout.headerHeight, justifyContent: 'center', marginTop: t.space[2] },
}));
