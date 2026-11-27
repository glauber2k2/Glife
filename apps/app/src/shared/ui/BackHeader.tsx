import type { Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { goBackOr } from '../navigation/backNavigation';

import { IconButton } from './IconButton';
import { Text } from './Text';
import { makeStyles } from './theme';

export interface BackHeaderProps {
  /** título central (16/600); vazio deixa só o voltar */
  title?: string;
  /** linha pequena sob o título */
  subtitle?: string;
  /** o que o leitor de tela anuncia no botão (ex.: o nome da tela anterior) */
  backLabel?: string;
  /** para onde ir quando não há histórico (tela aberta direto pelo endereço) */
  fallback?: Href;
  /** ação circular à direita (42 px); sem ela, um espaço do mesmo tamanho mantém o título centrado */
  right?: ReactNode;
  /** substitui o voltar (ex.: fechar) */
  left?: ReactNode;
  onBack?: () => void;
}

/** TopBar do Cobalto: voltar circular, título central e ação à direita. */
export function BackHeader({ title, subtitle, backLabel = 'Voltar', fallback = '/', right, left, onBack }: BackHeaderProps) {
  const s = useStyles();
  return (
    <View style={s.bar}>
      <View style={s.side}>
        {left ?? (
          <IconButton
            icon={ChevronLeft}
            label={backLabel}
            onPress={onBack ?? (() => goBackOr(fallback))}
          />
        )}
      </View>
      <View style={s.center}>
        {!!title && (
          <Text variant="emphasis" align="center" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text variant="caption" tone="tertiary" align="center" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[s.side, s.right]}>{right}</View>
    </View>
  );
}

/** Nome do design system. */
export const TopBar = BackHeader;

const useStyles = makeStyles((t) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.touch.minTarget },
  side: { minWidth: t.size.iconButton, flexDirection: 'row', gap: t.space[2] },
  right: { justifyContent: 'flex-end' },
  center: { flex: 1, minWidth: 0 },
}));
