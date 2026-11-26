import type { ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface ScreenProps {
  title?: string;
  /** texto pequeno acima do título (ex.: data de hoje) */
  eyebrow?: string;
  /** frase curta abaixo do título */
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  /** coluna mais estreita (telas de acesso) */
  maxWidth?: number;
  /** ação à direita do título (ex.: botão circular de criar) */
  action?: ReactNode;
  /** TopBar (voltar + título central) no topo da tela, antes do título grande */
  header?: ReactNode;
  /** tela de aba: deixa espaço para a barra flutuante no rodapé */
  tabBar?: boolean;
  /** espaço entre blocos (padrão 24) */
  gap?: number;
  /** conteúdo preso no rodapé (CTA), fora da rolagem */
  footer?: ReactNode;
}

/** Contêiner padrão do Cobalto: fundo cinza, margem de 20 px (24 no web), coluna de 720 px no web, 24 px entre blocos. */
export function Screen({ title, eyebrow, subtitle, children, scroll = true, maxWidth, action, header, tabBar, gap, footer }: ScreenProps) {
  const s = useStyles();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= t.layout.contentMaxWidth;
  const content = (
    <View style={[s.column, maxWidth !== undefined && { maxWidth }, gap !== undefined && { gap }]}>
      {header}
      {(title || eyebrow) && (
        <View style={s.header}>
          <View style={s.titles}>
            {eyebrow && (
              <Text variant="eyebrow" tone="tertiary">
                {eyebrow}
              </Text>
            )}
            {title && (
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="small" tone="tertiary">
                {subtitle}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
  const pad = [s.scroll, web && s.scrollWeb, tabBar && !web && s.withTabBar, !!footer && s.withFooter];
  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      {scroll ? (
        // Ao focar um campo, rola até ele ficar acima do teclado (com folga para o texto de ajuda).
        <KeyboardAwareScrollView
          contentContainerStyle={pad}
          keyboardShouldPersistTaps="handled"
          bottomOffset={t.layout.blockGap * 2}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[...pad, s.fill]}>{content}</View>
      )}
      {footer && <View style={[s.footer, web && s.footerWeb]}>{footer}</View>}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter, paddingTop: t.space[1.5], paddingBottom: t.space[10] },
  scrollWeb: { paddingHorizontal: t.layout.gutterWeb, paddingTop: t.space[6] },
  withTabBar: { paddingBottom: t.layout.tabBarSpace + t.space[3] },
  withFooter: { paddingBottom: t.layout.tabBarSpace },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: t.layout.contentMaxWidth, alignSelf: 'center', gap: t.layout.blockGap },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3] },
  titles: { flex: 1, gap: t.space[0.5] },
  footer: {
    position: 'absolute',
    left: t.space[0],
    right: t.space[0],
    bottom: t.space[0],
    paddingHorizontal: t.layout.gutter,
    paddingTop: t.space[4],
    paddingBottom: t.space[6],
    backgroundColor: t.colors.bg,
  },
  footerWeb: { alignSelf: 'center', width: '100%', maxWidth: t.layout.contentMaxWidth, paddingHorizontal: t.layout.gutterWeb },
}));
