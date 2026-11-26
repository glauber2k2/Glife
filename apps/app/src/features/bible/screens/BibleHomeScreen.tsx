import { formatRef, getBook, parseBibleRef, toOsis } from '@glife/domain/bible';
import { useState } from 'react';
import { View } from 'react-native';

import { BookOpen } from 'lucide-react-native';

import { BackHeader, Card, EmptyState, Input, ModuleIcon, Screen, Text, makeStyles } from '@/shared/ui';

export function BibleHomeScreen() {
  const s = useStyles();
  const [query, setQuery] = useState('');
  const ref = query.trim() ? parseBibleRef(query) : null;

  return (
    <Screen header={<BackHeader title="Bíblia" fallback="/" />}>
      <Input
        placeholder="Ir para… (ex.: Jo 3:16, Sl 23)"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
      />
      {ref && (
        <Card>
          <View style={s.result}>
            <ModuleIcon icon={BookOpen} module="bible" />
            <View style={s.texts}>
              <Text variant="emphasis">{formatRef(ref, 'name')}</Text>
              <Text variant="caption" tone="tertiary">
                {getBook(ref.book)?.testament === 'AT' ? 'Antigo' : 'Novo'} Testamento · glife://bible/{toOsis(ref)}
              </Text>
            </View>
          </View>
        </Card>
      )}
      {query.trim() !== '' && !ref && <EmptyState compact message="Referência não reconhecida." />}
      <EmptyState title="Leitura em breve" message="O texto da Bíblia Livre (CC BY 4.0) chega na Fase 4." mood="dormindo" />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  result: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  texts: { flex: 1, gap: t.space[0.5] },
}));
