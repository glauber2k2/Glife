// Ações da busca universal: criar e ir para as telas do app. Ficam com a navegação (conhece as rotas).
import type { SearchAction } from '@glife/domain/search';

const go = (id: string, label: string, href: string, keywords: string[] = []): SearchAction => ({
  id,
  label: () => label,
  keywords,
  href: () => href,
});

export const SEARCH_ACTIONS: SearchAction[] = [
  {
    id: 'new-note',
    label: (q) => (q ? `Nova nota: ${q}` : 'Nova nota'),
    keywords: ['criar', 'escrever', 'anotar'],
    href: (q) => (q ? `/nota/nova?titulo=${encodeURIComponent(q)}` : '/nota/nova'),
    anyQuery: true,
  },
  go('inbox', 'Caixa de entrada', '/caixa-de-entrada', ['anotar', 'capturar', 'inbox']),
  go('today', 'Ir para Hoje', '/', ['inicio', 'dia']),
  go('notes', 'Ir para Notas', '/notas'),
  go('finance', 'Ir para Finanças', '/financas', ['dinheiro', 'gastos', 'contas']),
  go('bible', 'Ir para Bíblia', '/biblia', ['leitura']),
  go('folders', 'Abrir Pastas', '/pastas'),
  go('trash', 'Abrir Lixeira', '/lixeira', ['excluidas', 'apagadas']),
  go('settings', 'Abrir Ajustes', '/ajustes', ['configuracoes', 'tema', 'aparencia', 'escuro']),
];
