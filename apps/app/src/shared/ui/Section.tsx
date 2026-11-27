import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from './Button';
import { Mascot, type MascotMood } from './Mascot';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface SectionProps {
  /** rótulo do grupo */
  title?: string;
  /** ação à direita do título */
  action?: ReactNode;
  /** label — rótulo 12 em caixa alta (Ajustes, formulários) · heading — título 20 de seção (Início, listas) */
  kind?: 'label' | 'heading';
  /** mantido por compatibilidade: o Cobalto separa blocos por espaço, sem linha */
  divider?: boolean;
  children: ReactNode;
}

/** Bloco de tela: rótulo (ou título de seção) e o conteúdo, normalmente um Card ou ListGroup. */
export function Section({ title, action, kind = 'label', children }: SectionProps) {
  const s = useStyles();
  return (
    <View style={[s.section, kind === 'heading' && s.sectionHeading]}>
      {(title || action) && (
        <View style={[s.header, kind === 'heading' && s.headerHeading]}>
          {title ? (
            <Text variant={kind === 'heading' ? 'heading' : 'label'} tone={kind === 'heading' ? 'primary' : 'tertiary'} accessibilityRole="header" style={s.title}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      <View style={s.body}>{children}</View>
    </View>
  );
}

export interface SectionHeaderProps {
  title: string;
  /** ação complementar, independente do link (ex.: ocultar valores) */
  accessory?: ReactNode;
  /** link à direita ("Ver tudo") */
  actionLabel?: string;
  onAction?: () => void;
  /** texto discreto à direita quando não há ação (ex.: total do dia) */
  meta?: string;
}

/** Título 20 de seção com uma ação em link cobalto (ou um texto discreto à direita). */
export function SectionHeader({ title, actionLabel, onAction, meta, accessory }: SectionHeaderProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={[s.header, s.headerHeading, !!accessory && s.headerAccessory]}>
      <Text variant="heading" accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <View style={s.headerActions}>
      {accessory}
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={t.touch.hitSlop + t.space[1]}>
          <Text variant="small" tone="accent" style={s.link}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
      {!(actionLabel && onAction) && meta ? (
        <Text variant="small" tone="tertiary" numeric>
          {meta}
        </Text>
      ) : null}
      </View>
    </View>
  );
}

export function Divider() {
  const s = useStyles();
  return <View style={s.rule} />;
}

export interface EmptyStateProps {
  message: string;
  /** título curto acima da frase (com o mascote) */
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** compacto: só a frase e um link, sem mascote (dentro de blocos) */
  compact?: boolean;
  mood?: MascotMood;
}

/** Estado vazio: mascote flutuando, título, uma frase gentil e uma ação. */
export function EmptyState({ message, title, actionLabel, onAction, compact, mood }: EmptyStateProps) {
  const s = useStyles();
  const t = useTheme();
  if (compact || !title) {
    return (
      <View style={s.mini}>
        <Text variant="small" tone="tertiary" style={s.miniText}>
          {message}
        </Text>
        {actionLabel && onAction && <Button label={actionLabel} variant="ghost" size="sm" onPress={onAction} />}
      </View>
    );
  }
  return (
    <View style={s.empty}>
      <Mascot size={t.size.mascot} eyes={t.colors.bg} mood={mood} float />
      <Text variant="heading" align="center" style={s.emptyTitle}>
        {title}
      </Text>
      <Text variant="body" tone="tertiary" align="center" style={s.emptyText}>
        {message}
      </Text>
      {actionLabel && onAction && <Button label={actionLabel} size="compact" selfAlign="center" onPress={onAction} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.space[2.5] },
  sectionHeading: { gap: t.space[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space[3] },
  headerHeading: { alignItems: 'baseline' },
  headerAccessory: { alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], flexShrink: 0 },
  title: { flexShrink: 1 },
  body: { gap: t.space[3] },
  link: { fontFamily: t.type.chip.font },
  rule: { height: t.hairline, backgroundColor: t.colors.hairline, alignSelf: 'stretch' },
  mini: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.space[2], paddingVertical: t.space[1] },
  miniText: { flexShrink: 1 },
  empty: { alignItems: 'center', gap: t.space[2.5], paddingVertical: t.space[7], paddingHorizontal: t.space[3] },
  emptyTitle: { marginTop: t.space[1.5] },
  emptyText: { maxWidth: t.layout.emptyTextMax, marginBottom: t.space[1] },
}));
