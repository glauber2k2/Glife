---
name: ferramenta-ia
description: Ensinar a IA da caixa de entrada do Vida a fazer algo novo (nova ferramenta de busca, criação ou alteração).
---

# Ferramenta de IA

1. Em `packages/domain/src/<feature>/ai-tools.ts`, defina a ferramenta com schema Zod (convertido para JSON Schema).
2. A ferramenta chama **a mesma função de `rules.ts`** que a tela usa — nada de lógica duplicada.
3. Busca executa de verdade (leitura com o usuário); criação/alteração **só gera proposta**.
4. Excluir nunca é ferramenta: no máximo propor mover para a lixeira.
5. Ao aplicar uma proposta, registre em `ai_actions` o estado anterior e o novo; implemente o "desfazer".
6. Registre a ferramenta no agregador da Edge Function `supabase/functions/ai-agent`.
7. Adicione ao menos 3 frases de teste na suíte de avaliação (entrada → ações esperadas).
