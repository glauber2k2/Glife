// Entrega o .md exportado: no web baixa o arquivo; no Android abre o compartilhar do sistema com o texto em markdown
// (o RN não compartilha arquivo sem lib nativa nova; o título leva o nome do arquivo).
import { Platform, Share } from 'react-native';

/** Tempo para o navegador começar o download antes de liberar o endereço do arquivo. */
const REVOKE_AFTER_MS = 1000;

/** true quando entregou (baixou ou compartilhou); false se a pessoa fechou o compartilhar sem escolher. */
export async function shareMarkdown(fileName: string, markdown: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const doc = globalThis.document;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = fileName;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    return true;
  }
  const result = await Share.share({ title: fileName, message: markdown });
  return result.action !== Share.dismissedAction;
}
