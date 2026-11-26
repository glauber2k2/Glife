// Cartão "Próxima refeição" do Início (Cobalto): bloco de ícone da dieta, horário, nome e o que comer;
// "Comi" registra na hora. Sem plano, convida a montar.
import { nextMeal } from '@glife/domain/diet';
import { localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { Salad } from 'lucide-react-native';
import { View } from 'react-native';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import { Button, Card, ModuleIcon, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useDietMaybe } from '../hooks/DietData';

export function TodayDietBlock() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const diet = useDietMaybe();
  if (!diet?.data) return null;
  const now = localNow();
  const next = nextMeal(diet.data.plan, diet.data.logs, now);
  const ate = async () => {
    if (!next) return;
    try {
      await diet.repo.createLog({ date: now.date, time: now.time, plan_id: next.item.id });
      toast({ message: 'Refeição registrada', icon: Salad });
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };
  const when = next ? `${next.date === now.date ? '' : `${formatDateInput(next.date).slice(0, 5)} · `}${next.item.time}` : '';
  return (
    <Card padding="tight" gap={t.space[2]} onPress={() => router.push('/dieta')} accessibilityLabel={next ? `Próxima refeição: ${next.item.name}, ${when}` : 'Dieta'}>
      <View style={s.top}>
        <ModuleIcon icon={Salad} module="diet" size="sm" />
        {next && next.date === now.date && <Button label="Comi" size="sm" variant="secondary" selfAlign="center" onPress={() => void ate()} />}
      </View>
      {next ? (
        <>
          <Text variant="micro" tone="tertiary" numeric>{`Próxima refeição · ${when}`}</Text>
          <Text variant="item" style={s.name}>
            {next.item.name}
          </Text>
          {next.item.description ? (
            <Text variant="micro" tone="tertiary" numberOfLines={2}>
              {next.item.description}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text variant="item" style={s.name}>
            Dieta
          </Text>
          <Text variant="micro" tone="tertiary">
            Monte o plano alimentar para ver a próxima refeição aqui.
          </Text>
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2] },
  name: { fontFamily: t.type.emphasis.font },
}));
