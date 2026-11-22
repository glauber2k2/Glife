import { formatRef, getBook, parseBibleRef, toOsis } from '@vida/domain/bible';
import { useState } from 'react';
import { View } from 'react-native';

import { Input, Screen, Section, Text, makeStyles } from '@/shared/ui';

export function BibleHomeScreen() {
  const s = useStyles();
  const [query, setQuery] = useState('');
  const ref = query.trim() ? parseBibleRef(query) : null;

  return (
    <Screen title="Bíblia">
      <Input
        placeholder="Ir para… (ex.: Jo 3:16, Sl 23)"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
      />
      {ref && (
        <View style={s.result}>
          <Text variant="heading">{formatRef(ref, 'name')}</Text>
          <Text variant="caption" tone="tertiary">
            vida://bible/{toOsis(ref)} · {getBook(ref.book)?.testament === 'AT' ? 'Antigo' : 'Novo'} Testamento
          </Text>
        </View>
      )}
      {query.trim() !== '' && !ref && <Text tone="tertiary">Referência não reconhecida.</Text>}
      <Section title="Texto">
        <Text variant="scripture" tone="secondary">
          O texto da Bíblia Livre (CC BY 4.0) chega na Fase 4.
        </Text>
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  result: { gap: t.space[1] },
}));
