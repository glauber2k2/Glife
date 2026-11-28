# Glife IA — agente com DeepSeek Flash (Fase 6) — desenho

Data: 27/11/2026 · Branch: `fase-6-ia` · Status: aprovado pelo usuário em 27/11/2026, incluindo a migração (tabelas de uso, teto e caixa de entrada)

## Intenção

O usuário quer um **agente de verdade** dentro do Glife: pede em linguagem natural e a IA faz, em qualquer módulo.
Exemplos dele: criar nota, verificar investimentos, ajudar a economizar, analisar gastos, analisar uma ou várias
notas, verificar e ajudar na dieta, criar dieta, criar lembrete e evento, verificar agenda e compromissos, e
**editar, alterar ou excluir** o que já existe. Uso pessoal, custo baixo (por isso o DeepSeek Flash), com **segurança
e privacidade** tratadas como requisito, não como extra.

## Metas

- Um agente único (tela "Glife IA") que lê, cria, edita e exclui em todos os módulos que já existem: notas e pastas,
  links, agenda (eventos e lembretes), finanças (contas, cartões, lançamentos, recorrências, orçamentos,
  categorias), investimentos, compras, dieta (plano e registros) e Bíblia (só leitura e marcações).
- Análises: gastos por categoria e período, onde economizar, evolução dos investimentos, resumo de notas, aderência à
  dieta, agenda do dia ou da semana.
- Toda ação da IA é registrada e pode ser desfeita.
- Teto mensal de gasto com a IA, medido no servidor.

## Não metas (agora)

- Agente rodando sem o app aberto (tarefas em segundo plano, agendadas ou por notificação).
- Voz, foto da refeição com calorias (depende da Fase 5) e Galeria.
- Escolher modelo por tarefa: o Flash atende tudo; o id do modelo fica num secret para troca futura.

## Antimetas (falha mesmo que "funcione")

- A IA apagar algo de vez, ou alterar dinheiro/excluir sem o usuário ver e confirmar.
- Dados pessoais (e-mail, CPF, telefone, números de conta/cartão, ids internos) saírem para o DeepSeek.
- O servidor passar a ler o banco do usuário para a IA.
- A IA gravar algo que a tela recusaria (pular validação do domínio).
- Conteúdo de conversa ou de dados aparecer em log.
- Um texto dentro de uma nota (injeção de instrução) fazer a IA agir sem a regra de confirmação.

## Restrições do projeto

- Local-first: dados no SQLite do aparelho, sync com Supabase via PowerSync.
- Segredos só nos secrets das Edge Functions; o app só conhece `EXPO_PUBLIC_*`.
- Edge Functions exigem sessão `aal2` (`_shared/auth.ts`), limitam o corpo e não registram dados do usuário.
- Regras de importação: features não se conhecem; a raiz `_layout.tsx` compõe fontes de várias features (como já faz
  com busca e links). `packages/domain` não importa React/Expo/Supabase e é usado pelas Edge Functions (Deno).
- Repositório público: nada sensível versionado.
- Telas seguem o protótipo `docs/prototipos/redesign-cobalto/` (Glife IA, Conversas, Ações da IA, Captura, Caixa de
  entrada, Ajustes → Glife IA).

## Abordagens consideradas

1. **Agente no aparelho (escolhida pelo usuário).** A Edge Function `ai-agent` só faz a ponte com o DeepSeek (chave,
   MFA, teto, limpeza de dados pessoais, limites). O app executa as ferramentas com os repositórios que as telas já
   usam. Vê o que ainda não sincronizou, confirmação e desfazer acontecem na hora, e o servidor nunca lê o banco.
   Custo: o app precisa estar aberto enquanto a IA trabalha.
2. **Agente no servidor (como o guf_backend).** A Edge Function roda a conversa e as ferramentas direto no Postgres.
   Exigiria reescrever o acesso a dados de todos os módulos para o servidor, não veria o que não sincronizou, o
   desfazer dependeria do sync e o servidor leria todos os dados. Descartada por ir contra o local-first.
3. **Misto (ler no servidor, gravar no aparelho).** Junta os problemas dos dois. Descartada.

## Decisões do usuário

- **Provedor:** DeepSeek API, modelo `deepseek-flash` (DeepSeek-V4.1-Flash). Ciente do risco de os dados serem
  processados e armazenados na China; a mitigação é minimização + limpeza (abaixo).
- **SDK:** o mesmo do guf_backend: Vercel AI SDK, `npm:ai@7.0.131`, com o provedor `@ai-sdk/deepseek` na versão
  compatível (mesmas dependências internas `@ai-sdk/provider` / `provider-utils` do `ai@7.0.131`). No app, o mesmo
  pacote `ai` e `@ai-sdk/react` alinhados a essa versão.
- **Arquitetura:** abordagem 1 (agente no aparelho).
- **Política de ação (opção 3, "misto"):**
  - Ler e analisar: direto.
  - Criar e editar: direto, e o resultado aparece como cartão com "Desfazer".
  - **Excluir, qualquer coisa que mexa com dinheiro (lançamentos, contas, cartões, recorrências, orçamentos,
    investimentos) e mudanças em lote: cartão "Confirmar?" antes de gravar.**
- **Caixa de entrada e Captura seguem a mesma política** (usuário, 27/11/2026): o texto capturado é processado pelo
  mesmo agente; o simples é criado direto com "Desfazer", o que mexe com dinheiro/exclusão/lote vem com "Confirmar?".
  Substitui o "propostas → Aplicar" do protótipo e do plano da Fase 6.

## Desenho

### Peças

- **Definições de ferramenta por feature, no domínio** (como manda a skill `ferramenta-ia`):
  `packages/domain/src/<feature>/ai-tools.ts` com nome, descrição, esquema Zod de entrada e **categoria de risco**
  (`read` | `write` | `confirm`, mais as marcas `money`/`bulk`). A entrada é validada pelas **mesmas regras** que a tela
  usa. Um agregador em `packages/domain/src/ai/` junta todas; a Edge Function usa só as definições (envia ao modelo)
  e o app usa as definições + os executores.
- `packages/domain/src/ai/` (TS puro, usado pelo app e pela Edge Function):
  - Agregador das ferramentas e cálculo da política de confirmação a partir da categoria de risco, **no código**,
    nunca pelo modelo.
  - `redactPersonalData` (mesmos padrões do `guf-ai/privacy.ts`: e-mail, CPF, CNPJ, telefone, links, números longos)
    com testes; usado no servidor sobre tudo que vai ao provedor.
  - Apelidos de id: o app troca UUIDs por apelidos curtos por conversa (`n1`, `t3`, `e2`) antes de enviar e
    desfaz ao receber; ids reais nunca saem do aparelho.
  - Tabela de preço do `deepseek-flash` e cálculo do custo de uma chamada a partir do `usage` (cache hit, cache miss,
    saída; pico/fora do pico pelo horário UTC da página oficial).
  - Agregações para análise (ex.: gasto por categoria/mês, aderência da dieta) quando ainda não existirem no domínio
    da feature: ficam na própria feature do domínio, não em `ai/`.
- `supabase/functions/ai-agent/` (Deno), no formato do `guf-ai`:
  - `model.ts`: único arquivo que conhece o provedor (`createDeepSeek`), lê `DEEPSEEK_API_KEY` e `GLIFE_AI_MODEL`
    (padrão `deepseek-flash`).
  - `handler.ts`: `requireAal2` → limite de corpo → valida o pedido (Zod) → confere o teto (RPC) → limpa dados
    pessoais das mensagens e resultados de ferramenta → `streamText` com as **definições** das ferramentas (sem
    `execute`: quem executa é o app) → registra o custo real ao terminar → devolve o stream.
  - Limites: tamanho do pedido, número de mensagens, passos por resposta, tempo máximo; erros com texto claro e
    código (padrão `reply-guard.ts`); log só com motivo/código, nunca conteúdo.
  - Busca/fetch do lado do servidor do DeepSeek: não usados.
- Migração (autorização explícita do usuário necessária, ver AGENTS.md → Segurança): tabela `ai_usage` (padrão `vida_apply_standard`, por chamada: data, tokens, custo) e RPC
  `consume_ai_budget` atômica (confere e registra numa transação, pedidos em paralelo não furam o teto). O teto mensal
  fica em `ai_settings` (uma linha por usuário). Ambas no sync só se a tela de Ajustes precisar ler o uso offline
  (chamada do construtor).
- `apps/app/src/features/ai/` (feature nova):
  - Cliente do agente com `useChat` (`@ai-sdk/react`) apontando para a Edge Function, com o token da sessão; ferramentas
    executadas no app via `onToolCall`/`addToolResult`.
  - **Executores por injeção:** cada feature exporta `use<Feature>AiTools()` no seu `index.ts` (executores das
    ferramentas definidas no domínio, chamando seus repositórios); a raiz `_layout.tsx` junta e entrega a um
    `AiToolsProvider` (mesmo padrão de `useLinksSearchSources`). Nenhuma feature importa outra. Um teste garante que
    toda definição do agregador tem executor.
  - Executor: valida a entrada com o esquema Zod, aplica a política (direto / confirmar), chama o repositório, grava a
    ação no registro de ações e devolve ao modelo um resultado **mínimo** (só os campos necessários, listas com
    limite, preferindo totais a linhas cruas).
  - Registro de ações (`ai_actions`): estado anterior e posterior de cada item tocado, para "Desfazer" (inclusive
    desfazer de exclusão = tirar da lixeira). Gravações de várias coisas são tudo ou nada.
  - Telas (do protótipo): Glife IA (conversa com cartões de ação "Desfazer" e "Confirmar?"), Conversas, Ações da IA,
    e Ajustes → Glife IA (teto em R$, uso do mês). A Captura e a Caixa de entrada passam a usar o mesmo agente.
- Cada feature ganha ferramentas de ler, criar, editar, mandar para a lixeira e analisar.
- A skill `.claude/skills/ferramenta-ia/SKILL.md` é atualizada para a decisão do usuário: criar/editar é direto com
  desfazer (não só proposta); dinheiro, exclusão e lote pedem confirmação; executores no app.

### Medidas de segurança e privacidade (resumo)

1. Chave do DeepSeek só no secret da Edge Function.
2. Toda chamada exige sessão com MFA (`aal2`).
3. O servidor não lê o banco: só repassa o que o app enviou.
4. Minimização: ferramentas devolvem só o necessário, com limite de linhas; análises mandam totais.
5. Limpeza no servidor de e-mail, CPF, CNPJ, telefone, links e números longos em tudo que vai ao provedor.
6. Ids reais nunca saem do aparelho (apelidos por conversa).
7. Política de confirmação aplicada no código pela categoria da ferramenta: um texto malicioso numa nota não consegue
   pular o "Confirmar?". O prompt de sistema trata resultados de ferramenta como dados, não como ordens.
8. **Excluir = mandar para a lixeira.** A IA não tem ferramenta de apagar de vez nem de esvaziar a lixeira.
9. Teto mensal medido no servidor, de forma atômica.
10. Limites de tamanho, passos e tempo; logs sem conteúdo.
11. Tudo que a IA faz fica em "Ações da IA" com desfazer.

### Etapas de entrega

1. **Fundação:** domínio `ai`, Edge Function `ai-agent`, migração de uso/teto, feature `ai` com executor, política,
   registro de ações e tela Glife IA básica; ferramentas de **notas e agenda**. Primeiro passo: provar que o streaming
   do `useChat` funciona no Expo (Android e web) com `expo/fetch`.
2. **Finanças, investimentos e compras:** ferramentas e análises (gastos, economia, carteira).
3. **Dieta e Bíblia:** criar/ajustar plano, analisar registros; ler e marcar na Bíblia.
4. **Caixa de entrada, Captura, Conversas, Ações da IA e Ajustes completos.**

Cada etapa termina com `pnpm lint && pnpm typecheck && pnpm test` verdes e, a partir da 1, com a suíte de frases de
teste do plano (Fase 6: "Suite de 20 frases").

## Chamadas minhas (o usuário pode mudar)

- O botão "aplicar sem perguntar" do protótipo de Ajustes **sai**: a política fixa é a opção 3.
- Flash em tudo (o protótipo previa modelo rápido na caixa e mais forte na conversa).
- Excluir é sempre lixeira (o protótipo já dizia que apagar não é ferramenta da IA).
- Conversas e registro de ações ficam **só no aparelho** (tabelas locais fora do sync), para o conteúdo das conversas
  não ir ao Supabase.
- Modo sem raciocínio estendido no Flash por padrão (mais rápido e barato, como o guf); medir na suíte de frases.
- **Dados pessoais que o próprio usuário quer gravar** (telefone, e-mail, link, número longo num texto): o app troca
  cada um por um marcador local (`[tel1]`, `[link2]`) antes de enviar, como faz com os ids, e repõe o valor real ao
  executar a ferramenta. Assim "lembrete: ligar para o João 11 9…" grava o número sem ele sair do aparelho. A limpeza
  no servidor continua como segunda rede e não mexe nos marcadores.
- **Dinheiro vai ao modelo formatado** ("R$ 150.000,00"), nunca em centavos crus (evita a limpeza de números longos
  e erro de escala); o executor converte de volta para centavos com `money.ts`.
- **Teto em dólar** (usuário, 28/11/2026: "coloque o limite em dólar mesmo"): padrão **US$ 2,00 por mês**, a mesma
  moeda e valor da recarga na DeepSeek, sem cotação; editável em Ajustes; sempre existe um teto. Uso e teto guardados
  em micro-dólares (migração `20261202000003`). Reserva atômica antes de chamar o modelo e acerto no fim. Ao estourar
  no meio de uma resposta, o turno atual termina e o próximo pedido é recusado. Saldo acabado na DeepSeek chega como
  erro 402 com aviso claro.
- **Captura:** cada texto vira um item `inbox_items` (tabela sincronizada como as demais, com RLS padrão), estado
  `pendente` → `processado`; sem internet ou com o app fechado, fica pendente e é processado quando o app abrir com
  conexão. Capturar no web e processar no celular funciona.
- **Se o streaming do `useChat` não funcionar no Expo:** a fase não trava; o cliente usa resposta sem streaming (um
  pedido por passo do laço de ferramentas, executado no app), mantendo a mesma Edge Function com um modo sem stream.

## O que fica para o construtor

Nomes exatos de arquivos, tabelas e ferramentas; formato do pedido à Edge Function; limites numéricos; como mostrar o
pico/fora do pico; se `ai_usage`/`ai_settings` entram no sync; detalhes visuais seguindo a ficha do protótipo.
