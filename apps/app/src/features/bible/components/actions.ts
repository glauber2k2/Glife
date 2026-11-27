// Registro aberto das ações do menu de um trecho (versículos selecionados ou capítulo). As ações desta etapa
// (anotar, copiar) se registram aqui; a IA e outras ações futuras entram do mesmo jeito, sem mexer no leitor.
import type { Translation } from '@glife/domain/bible';
import type { LucideIcon } from 'lucide-react-native';

export interface PassageContext {
  translation: Translation;
  book: string;
  chapter: number;
  /** versículos selecionados, em ordem (vazio = o capítulo inteiro) */
  verses: number[];
  /** texto de cada versículo do capítulo (índice = versículo − 1) */
  texts: readonly string[];
  /** limpa a seleção / fecha o menu */
  close(): void;
  /** aviso curto ao usuário (ex.: "Copiado") */
  notify(message: string): void;
}

export interface PassageAction {
  id: string;
  label: string;
  icon: LucideIcon;
  appliesTo: 'verse' | 'chapter' | 'both';
  run(ctx: PassageContext): Promise<void> | void;
}

const registry: PassageAction[] = [];

/** Registra (ou substitui, pelo id) uma ação do menu. */
export function registerPassageAction(action: PassageAction): void {
  const i = registry.findIndex((a) => a.id === action.id);
  if (i >= 0) registry[i] = action;
  else registry.push(action);
}

export function passageActions(kind: 'verse' | 'chapter'): PassageAction[] {
  return registry.filter((a) => a.appliesTo === kind || a.appliesTo === 'both');
}
