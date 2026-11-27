// Traduções da Bíblia: as que vêm no app (com o crédito da licença) e as importadas pelo usuário, que ficam só neste
// aparelho (nunca sobem ao servidor). Importar: escolher os arquivos (USFM, um livro por arquivo, ou o JSON do
// importador), dar sigla e nome; tudo ou nada, com o motivo quando recusa.
import { parseTranslationFiles, type ImportedFile, type Translation } from '@glife/domain/bible';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { BookOpen, Download, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Alert, BackHeader, Button, Dialog, IconButton, Input, ListGroup, ListItem, Screen, Section, Sheet, Text, makeStyles, useToast } from '@/shared/ui';

import { useBibleText } from '../hooks/BibleData';

/** Lê o texto dos arquivos escolhidos (no web pelo `File` do navegador; no aparelho pela cópia em cache). */
async function readPicked(assets: readonly DocumentPicker.DocumentPickerAsset[]): Promise<ImportedFile[]> {
  return Promise.all(
    assets.map(async (a) => ({
      name: a.name,
      text: Platform.OS === 'web' && a.file ? await a.file.text() : await new File(a.uri).text(),
    })),
  );
}

export function TranslationsScreen() {
  const s = useStyles();
  const toast = useToast();
  const { translations, translation, setTranslation, imported, bundledAbbrs, refreshTranslations } = useBibleText();
  const [files, setFiles] = useState<ImportedFile[] | null>(null);
  const [abbr, setAbbr] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Translation | null>(null);

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
      if (res.canceled || !res.assets.length) return;
      setFiles(await readPicked(res.assets));
    } catch (e) {
      toast({ message: `Não deu para ler os arquivos: ${errorText(e)}` });
    }
  };

  const confirm = async () => {
    if (!files) return;
    setBusy(true);
    try {
      const data = parseTranslationFiles(files, { abbr, name });
      const t = await imported.importTranslation(data, bundledAbbrs);
      refreshTranslations();
      setTranslation(t.id);
      setFiles(null);
      setAbbr('');
      setName('');
      toast({ message: `${t.name} importada · ${data.books.length} ${data.books.length === 1 ? 'livro' : 'livros'}` });
    } catch (e) {
      toast({ message: `Não deu para importar: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    const t = removing;
    setRemoving(null);
    try {
      await imported.removeTranslation(t.id);
      refreshTranslations();
      toast({ message: `${t.name} removida deste aparelho` });
    } catch (e) {
      toast({ message: `Não deu para remover: ${errorText(e)}` });
    }
  };

  const bundled = translations.filter((t) => t.source === 'bundled');
  const mine = translations.filter((t) => t.source === 'imported');

  return (
    <Screen header={<BackHeader title="Traduções" fallback="/biblia" backLabel="Bíblia" />}>
      <Section title="Vêm no app">
        <ListGroup>
          {bundled.map((t) => (
            <ListItem
              key={t.id}
              icon={BookOpen}
              module="bible"
              title={`${t.name} · ${t.abbr}`}
              subtitle={t.credit ?? undefined}
              onPress={() => setTranslation(t.id)}
              trailing={t.id === translation.id ? <Text variant="caption" tone="accent">Em uso</Text> : undefined}
            />
          ))}
        </ListGroup>
      </Section>

      <Section title="Importadas neste aparelho">
        {mine.length > 0 && (
          <ListGroup>
            {mine.map((t) => (
              <ListItem
                key={t.id}
                icon={BookOpen}
                module="bible"
                title={`${t.name} · ${t.abbr}`}
                subtitle={t.id === translation.id ? 'Em uso' : 'Tocar para usar'}
                onPress={() => setTranslation(t.id)}
                trailing={<IconButton icon={Trash2} label={`Remover ${t.name}`} variant="ghost" onPress={() => setRemoving(t)} />}
              />
            ))}
          </ListGroup>
        )}
        <Alert tone="info">
          Fica só neste aparelho, nunca vai para o servidor. Use apenas traduções que você tem direito de usar. Formatos: USFM (um
          livro por arquivo; dá para escolher vários) ou o JSON do importador do Glife.
        </Alert>
        <Button label="Importar tradução" icon={Download} variant="secondary" onPress={() => void pick()} />
      </Section>

      <Sheet visible={files !== null} onClose={() => !busy && setFiles(null)} title="Importar tradução" subtitle={files ? `${files.length} ${files.length === 1 ? 'arquivo' : 'arquivos'}` : undefined}>
        <View style={s.form}>
          <Input label="Sigla" placeholder="NVI" value={abbr} onChangeText={setAbbr} autoCapitalize="characters" autoCorrect={false} maxLength={8} />
          <Input label="Nome" placeholder="Nova Versão Internacional" value={name} onChangeText={setName} maxLength={60} />
          <Button label={busy ? 'Importando…' : 'Importar'} disabled={busy || !abbr.trim() || !name.trim()} onPress={() => void confirm()} />
        </View>
      </Sheet>

      <Dialog
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remover ${removing?.name ?? ''}?`}
        message="O texto sai deste aparelho. Suas marcações e notas continuam (são presas à referência)."
        actions={
          <>
            <Button label="Cancelar" variant="neutral" grow onPress={() => setRemoving(null)} />
            <Button label="Remover" variant="danger" grow onPress={() => void remove()} />
          </>
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4] },
}));
