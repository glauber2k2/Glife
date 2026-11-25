// Bloco "Próxima refeição" da tela Hoje (versão básica): horário, nome e o que comer; "Comi" registra na hora.
import { nextMeal } from '@glife/domain/diet';
import { localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import { Button, Section, Text, makeStyles, useToast } from '@/shared/ui';

import { useDietMaybe } from '../hooks/DietData';

export function TodayDietBlock() {
  const s = useStyles();
  const toast = useToast();
  const diet = useDietMaybe();
  if (!diet?.data) return null;
  const now = localNow();
  const next = nextMeal(diet.data.plan, diet.data.logs, now);
  const ate = async () => {
    if (!next) return;
    try {
      await diet.repo.createLog({ date: now.date, time: now.time, plan_id: next.item.id });
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };
  return (
    <Section title="Próxima refeição" action={<Button label="Dieta" variant="ghost" size="sm" onPress={() => router.push('/dieta')} />}>
      {next ? (
        <View style={s.row}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/dieta')} style={s.body}>
            <Text variant="item" numeric>{`${next.date === now.date ? '' : `${formatDateInput(next.date).slice(0, 5)} · `}${next.item.time} · ${next.item.name}`}</Text>
            {next.item.description ? <Text tone="secondary">{next.item.description}</Text> : null}
          </Pressable>
          {next.date === now.date && <Button label="Comi" size="sm" variant="secondary" selfAlign="center" onPress={() => void ate()} />}
        </View>
      ) : (
        <Text tone="tertiary">Sem plano alimentar. Toque em Dieta para montar.</Text>
      )}
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  body: { flex: 1, minWidth: 0, gap: t.space[1] },
}));
