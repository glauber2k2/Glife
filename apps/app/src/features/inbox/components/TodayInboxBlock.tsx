import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { Button, Section, Text } from '@/shared/ui';

/**
 * Bloco "Caixa de entrada" da tela Hoje. Ainda não há itens guardados (a tabela chega com a IA, Fase 6),
 * então mostra o vazio e o atalho para anotar.
 */
export function TodayInboxBlock({ firstUse = false }: { firstUse?: boolean }) {
  return (
    <Section
      title="Caixa de entrada"
      action={
        <Button
          label="Anotar algo"
          icon={Plus}
          variant="ghost"
          size="sm"
          onPress={() => router.push('/caixa-de-entrada')}
        />
      }
    >
      <Text tone="tertiary">
        {firstUse ? 'Nada pendente. Escreva solto; a IA separa e cria os itens.' : 'Nada pendente.'}
      </Text>
    </Section>
  );
}
