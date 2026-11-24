import { router } from 'expo-router';
import { Search, Settings2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { openSearch } from '@/features/search';
import { longDate } from '@/shared/lib/dates';
import { EmptyState, Icon, Screen, Section, makeStyles } from '@/shared/ui';

/** Tela Hoje: a única que compõe várias features (cada bloco vem da feature dona). */
export function TodayScreen() {
  const s = useStyles();
  return (
    <Screen eyebrow={longDate()} title="Hoje">
      <View style={s.settings}>
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar" hitSlop={12} onPress={openSearch}>
          <Icon icon={Search} color="textTertiary" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          hitSlop={12}
          onPress={() => router.push('/ajustes')}
        >
          <Icon icon={Settings2} color="textTertiary" />
        </Pressable>
      </View>
      <Section title="Próximo compromisso">
        <EmptyState message="Nada marcado por enquanto." />
      </Section>
      <Section title="Próxima refeição">
        <EmptyState message="Plano alimentar ainda não configurado." />
      </Section>
      <Section title="Gastos do mês">
        <EmptyState message="Nenhum gasto registrado." />
      </Section>
      <Section title="Devocional do dia">
        <EmptyState message="Ainda não fez o devocional de hoje." />
      </Section>
      <Section title="Caixa de entrada">
        <EmptyState
          message="Nada pendente."
          actionLabel="Anotar algo"
          onAction={() => router.push('/caixa-de-entrada')}
        />
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  settings: { position: 'absolute', right: 0, top: t.space[1], flexDirection: 'row', gap: t.space[5] },
}));
