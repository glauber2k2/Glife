# Plano de implementação — Glife (Organizador de Vida)

Baseado em `../Glife — Planejamento do Projeto.md` (22/11/2026; caminho relativo à raiz do repositório).
O roadmap original vinha num bloco embutido que não foi exportado; as fases abaixo
foram reconstruídas a partir da tabela de habilidades por fase e da seção de riscos.

Regra de ouro: **cada fase termina com 1 semana de uso real no dia a dia** antes da próxima.

**Ordem atual (desde 26/11/2026):** Fases 0–3 feitas → **Fase R** (redesign Cobalto de tudo que já existe) →
**Fase R2** (telas e funções novas do protótipo para os módulos que já existem) → Fases 4 a 7 (o restante), já no
visual novo. Design: `docs/design-system-cobalto/`; protótipo de todas as telas: `docs/prototipos/redesign-cobalto/`
(guia em `docs/prototipos/redesign-cobalto.md`).

---

## Fase 0 — Fundação (≈ 2 semanas)

Objetivo: o mesmo app abre no Android e no navegador, com login, banco local e sync.

| # | Entrega | Pronto quando | Status |
|---|---------|---------------|--------|
| 0.1 | Monorepo pnpm: `apps/app`, `packages/domain`, `supabase/`, `tools/` | `pnpm install` na raiz funciona | ✅ |
| 0.2 | App Expo SDK 58 + Expo Router + TypeScript, alias `@/` | `pnpm web` abre no navegador | ✅ |
| 0.3 | Design system: tokens (`shared/ui/theme`), fontes Hanken Grotesk + Crimson Pro + JetBrains Mono (direção Glaciar/Sinóptico, `docs/design-system/`, desde 23/11/2026), tema claro/escuro, componentes `Text`, `Button`, `Input`, `ListItem`, `Sheet`, `Chip` | Tela de demonstração nos dois temas | ✅ |
| 0.4 | Navegação: 4 abas (Hoje · Notas · Finanças · Bíblia) + botão central da caixa de entrada | Navega entre abas no web e no Android | 🟡 web ok; falta Android |
| 0.5 | `packages/domain`: base de entidade (UUID, timestamps, `deleted_at`), Zod, `links` (parser de `[[...]]` e URIs `glife://`) com testes | `pnpm test` verde | ✅ |
| 0.6 | ESLint com `eslint-plugin-boundaries` aplicando as 6 regras de importação | Import proibido quebra o lint | ✅ testado em `apps/app/tests/boundaries.test.ts` |
| 0.7 | Supabase: projeto, CLI, primeira migração (`links`, `notes`, `tags`) com RLS, cadastro público desligado, MFA | 2º usuário de teste não enxerga nada | 🟡 local ok (`supabase/tests/rls.test.ts`, 2 usuários + MFA); hospedado com as 3 migrações e RLS conferido (23/11) |
| 0.8 | PowerSync: schema local, sync rules por `user_id`, conector Supabase (upload queue) | Editar offline no celular e ver no web ao reconectar | 🟡 web ⇄ Supabase validado com notas (23/11); falta Android |
| 0.9 | Validar import de `packages/domain` numa Edge Function Deno (import map) | Função “hello” usando uma regra do domain | ✅ `hello` com 9 testes Vitest, check e execução real em Deno; sem deploy |
| 0.10 | `CLAUDE.md` + skills `.claude/skills/*` | Arquivos no repo | ✅ |
| 0.11 | APK local (`npx expo run:android`) | APK instalado no celular | ⏳ depende do Android Studio |
| 0.12 | Login: e-mail + senha forte + MFA (TOTP); sessão `aal2` obrigatória (o banco recusa `aal1`) | Entrar no web e no Android com MFA | 🟡 web validado com a conta real (23/11); falta Android |
| 0.13 | Sistema de movimento: React Native Reanimated, tokens de mola (200–350 ms, amortecidas), componentes base animados (botão que afunda, folhas e abas que deslizam, listas que se reorganizam), respeito a “reduzir movimento” | Demonstração em Ajustes; com “reduzir movimento” ligado nada anima | 🟡 T1–T4 e T9 concluídas: componentes, demo, abas e indicador Reanimated; stack/modal/Ajustes respeitam movimento reduzido dinâmico. Web validado; falta Android |

**Depende de você:** criar contas Supabase e PowerSync (grátis) e instalar Android Studio/SDK.

**Antes da 0.8 (arquitetura) — ✅ contratos prontos (T7: `@glife/domain/{core,notes,links}` + suítes em `@glife/domain/testing`):** cada feature acessa dados só por uma interface de repositório (ex.: `NotesRepository`) definida no `domain`; a implementação com PowerSync fica em `features/<f>/data`. O lint deve proibir `@powersync/*` e `@supabase/*` fora de `data/` e `shared/lib` (inversão de dependência: telas não conhecem o banco). O conector de upload trata conflito de unicidade (23505, ex.: link ou tag criados offline em dois aparelhos) como sucesso idempotente, para não travar a fila.

`tools/` entra na Fase 4 (importador da Bíblia).

## Fase 1 — Notas, links, busca e bloqueio (≈ 4 semanas) → app vira ferramenta diária

- Notas: lista, pastas, tags, fixar, editor (campo de texto + pré-visualização markdown; editor rico fica para 1.5).
- Links: tabela `links` atualizada pelo parser ao salvar, `LinkPanel` com backlinks, autocomplete ao digitar `[[`.
- Registro de tipos (`glife://note` …) na feature `links`.
- Busca universal com FTS5 (Ctrl+K no web), incluindo ações (“nova nota”).
- Lixeira (exclusão lógica).
- `app-lock`: biometria + senha do app (scrypt/argon2 via `@noble/hashes`, `expo-secure-store`), espera crescente (sem esconder em recentes: decisão de 24/11/2026).
- Tela **Hoje** (inicialmente: notas recentes e fixadas).
- Fase 1.5: editor CodeMirror 6 via Expo DOM component (`"use dom"`).
- Movimento (princípio 6): item de lista que se risca e recolhe ao concluir, card que se expande até a tela de detalhe, transições entre lista e editor.

## Fase 2 — Finanças, compras e investimentos (≈ 4 semanas)

- `domain/finance/money.ts`: centavos, parcelas, formatação BRL (com testes).
- Contas, categorias, transações, orçamentos mensais; saldo por conta.
- Gráficos SVG, monocromáticos com destaque no dado relevante. ✅ 25/11/2026, desenhados com `react-native-svg` e Views, sem `react-native-gifted-charts` (`docs/prototipos/graficos.md`).
- Compras: listas e itens; “comprei” → vira gasto com 1 toque.
- Investimentos: ativos e movimentos (aporte, resgate, rendimento, cotação manual), evolução do patrimônio. ✅ 25/11/2026, com cotação automática de ações, FIIs (brapi) e cripto (CoinGecko) pela Edge Function `quotes` (`docs/prototipos/investimentos.md`).
- Hoje: gasto do mês vs. orçamento. ✅ 25/11/2026, bloco "Mês até agora" (`docs/prototipos/graficos.md`).

## Fase 3 — Agenda, lembretes e dieta (≈ 3 semanas)

- Eventos com repetição simples (diária, semanal com dias, mensal, anual; pular uma data), lembretes avulsos e avisos
  (`expo-notifications`, offline). ✅ 26/11/2026 em versão básica (sem design; redesenho depois). Repetição em campos,
  não RRULE (decisão do usuário: "Simples").
- Plano alimentar (refeições com horário e dias da semana), registro de refeições. ✅ 26/11/2026, versão básica.
- Hoje: próximo compromisso e próxima refeição. ✅ 26/11/2026, versão básica.

## Fase R — Redesign Cobalto do que já existe (≈ 3–4 semanas) ← falta conferir no aparelho

Objetivo: todas as telas e funções já implementadas (Fases 0–3) passam para o design system Cobalto, sem mudar
regras de negócio nem banco. Referência visual e de movimento: a ficha de cada tela no protótipo. "Pronto quando"
vale para toda etapa: igual ao protótipo nos dois temas, conferido em 360 dp com textos longos, no Android e no web,
com "reduzir movimento" respeitado e `pnpm lint && pnpm typecheck && pnpm test` verdes.

| # | Entrega | Telas do protótipo | Status |
|---|---------|--------------------|--------|
| R.0 | Fundação: tokens claro/escuro de `design-system-cobalto/tokens.css` em `shared/ui/theme/tokens.ts`; fontes Outfit, DM Mono e Literata (`@expo-google-fonts`) no lugar de Hanken/Crimson/JetBrains; raios, sombras por nível (só no que flutua), tokens de movimento (durações 90–500 ms e curvas bezier; toque 0,96; cascata 70 ms, até 6) | — | ✅ 26/11/2026 |
| R.1 | Componentes `shared/ui` refeitos e novos: Button (52/44/36), IconButton 42, Input com halo, MoneyField grande, SegmentedControl, Chip, Switch, Checkbox/TaskItem, TopBar, PageHeader, SectionHeader, Card, ListGroup/ListItem com ModuleIcon, ModuleTile, StatValue, ProgressBar (com previsto listrado), ProgressRing, Toast, Alert, EmptyState com Mascot, Sheet r28, Dialog, AIInsight, LinkPanel | Demonstração em Ajustes | ✅ demonstração em Ajustes |
| R.2 | Navegação: barra de abas flutuante Início · Agenda · + · Notas · IA (botão + gira e abre a captura); web com barra no topo de 64 px, coluna de 720 px, folhas como janela central e Ctrl+K | Barra de abas; modo Web | ✅ a 5ª aba é Finanças até a IA existir (Fase 6); falta conferir no Android |
| R.3 | Acesso e bloqueio | Entrar, Código, Configurar autenticador, Criar senha + digital, Bloqueio (6 estados), Segurança, Trocar senha | ✅ web conferido (Entrar); bloqueio sem teste no aparelho |
| R.4 | Início (ex-Hoje) e busca | Início (dia cheio, poucos módulos, primeiro uso), Busca universal | ✅ sem conferência visual com login |
| R.5 | Notas | Lista, Ler/Escrever com sugestões de `[[`, Nova nota, Pastas, Pasta, Lixeira e folhas (mais ações, mover, tags, tipo, ligar) | ✅ sem conferência visual com login |
| R.6 | Finanças | Início (mês atual/futuro/fechado/primeiro uso), Novo lançamento, Confirmar previsto, Extrato, Fatura + Pagar, Nova conta/cartão, Detalhe do lançamento, Recorrentes + editar, Orçamentos, Gráficos, Categoria | ✅ sem conferência visual com login |
| R.7 | Compras e investimentos | Listas, Lista + Comprei, Investimentos, Ativo + movimento, Novo ativo | ✅ sem conferência visual com login |
| R.8 | Agenda e dieta | Agenda (linha do tempo), Evento, Lembrete, Dieta, Refeição do plano, Registrar refeição | ✅ sem conferência visual com login |
| R.9 | Ajustes | Aparência, notificações, dados, conta, sair deste aparelho | ✅ notificações e exportar ficam para R2/Fase 7 |
| R.10 | Fechamento: revisão geral das transições (empurrar, aba, folha, cartão que vira tela), remoção dos tokens e fontes do Glaciar, APK novo | Todas acima | 🟡 tokens e fontes do Glaciar removidos; APK 0.5.0 gerado; falta revisão no aparelho (dois temas, 360 dp) |

Regras da fase: blocos e atalhos de módulos que ainda não existem (Bíblia, Galeria, IA) ficam recolhidos como no
estado "Poucos módulos" do Início, sem levar a telas vazias. O que o protótipo mostra de funcionalidade nova fica
para a Fase R2.

## Fase R2 — Complementos do protótipo nos módulos existentes — código concluído em 26/11/2026

Funções novas do protótipo implementadas nos módulos existentes. Migrações `20261127000001` e `20261127000002` aplicadas no Supabase após backup; RLS hospedado conferido sem problemas. Lint, TypeScript e 1.119 testes aprovados.

**Fechamento:** falta republicar `supabase/powersync/sync-streams.yaml` no painel do PowerSync e conferir as telas no Chrome/Android (dois temas, 360 dp), conforme `PENDENCIAS.md`. A folha Adiar oferece 10 minutos, 1 hora, amanhã às 9h e horário escolhido; preferências de notificações por módulo ficam para evolução posterior.

- Notas: tela de Tags e tag aberta (renomear, juntar, excluir); seleção múltipla (mover, tags, fixar, exportar,
  lixeira).
- Finanças: Categorias (gerenciar, ícone, cor, ordem, arquivar); Contas e cartões (ordem, arquivar, **ajuste de
  saldo** como lançamento fora do orçamento: regra nova em `domain/finance`).
- Agenda: calendário do mês. Dieta: histórico por semana e mês; **calorias e macros** (campos novos no plano e no
  registro: hoje o modelo não tem calorias).
- Sistema: central de Notificações (sino no Início); ações nos avisos do Android (Feito, Adiar, Confirmar,
  Registrar); tela de Sincronização e offline (fila pendente, sessão expirada); Abertura e primeira sincronização
  de um aparelho novo; Item não encontrado (na lixeira, ainda não sincronizado, excluído).

## Fase 4 — Bíblia (≈ 3 semanas) — 1ª etapa (leitor) com código pronto em 26/11/2026

**1ª etapa (branch `fase-4-biblia`, spec e plano em `docs/superpowers/`):** texto embutido da Bíblia Livre (CC BY 4.0)
e da Bíblia Portuguesa Mundial (domínio público) como assets por livro, fora do bundle JS e offline; leitor (Literata
19/32, um versículo por bloco, `?v=` rola até o versículo); seleção com barra flutuante: marca-texto em 4 cores,
sublinhado, remover, anotar e copiar (registro de ações aberto para a IA); **Anotar cria uma nota comum** com
`[[Jo 3:16]]` e a citação; o versículo mostra as notas que o citam (versículo, trecho ou capítulo) e a nota abre o
leitor; marcações em `bible_highlights` (migração `20261128000001`, sync); início da Bíblia (continuar, ir para, livros,
marcações recentes), troca de tradução e **importar tradução só no aparelho** (USFM ou JSON; tabelas locais fora do
sync). Atalho Bíblia em "Seus espaços". Falta: aplicar migração e sync-streams, conferência visual (Chrome/APK) e o
resto da fase abaixo (planos, busca no texto, editar versículo, ajustes Aa).

**Devocional não é módulo nem tipo de nota** (decisão do usuário, 27/11/2026): nota é só nota (os tipos devocional e
diário saíram do app e do banco); o devocional é uma nota comum com a tag `devocional`, feita no bloco de notas com a estrutura que já existe (tags, `[[Sl 23]]` e "notas que citam" no
versículo). Não há tela, modelo SOAP, linha do tempo nem opção isolada para ele; as telas "Devocional (SOAP)" e
"Linha do tempo devocional" do protótipo ficam fora do plano.

Telas do protótipo: Bíblia, Leitor (seleção, marca-texto, anotar, editar, ver original), Busca na Bíblia, Planos de
leitura; ajustes de leitura (Aa).

- `tools/bible-import`: USFM da Bíblia Livre → `blivre.sqlite` com FTS5 (31 mil versículos).
- Leitor em modo leitura (serifa 19/32), camadas: marcações, anotações, edições (restaurar/ver original), favoritos e progresso.
- Referências OSIS (`[[Jo 3:16]]` → `glife://bible/JHN.3.16`).
- Planos de leitura (pôr em dia, recomeçar), lembrete diário; crédito CC BY 4.0 visível.
- Liga o bloco da Bíblia no Início e o atalho em "Seus espaços".

## Fase 5 — Galeria e mídia (≈ 2 semanas)

Telas do protótipo: Galeria (com seleção), Foto ("usada em"), Álbum, Espaço das fotos.

- Interface `MediaStore` (domain) + Edge Function `media-sign` (`SupabaseStore`; `R2Store` preparado).
- Upload em fila offline, WebP + miniatura, `![[media:id]]`, painel “usada em”.
- Avisos de cota (800 MB / 950 MB) e a tela Espaço das fotos.
- Comprovante no Detalhe do lançamento e foto no Registro de refeição.

## Fase 6 — IA: caixa de entrada e agente (≈ 3 semanas)

Telas do protótipo: Captura (+), Caixa de entrada (organizando, propostas, pendentes), Glife IA (conversa), Conversas,
Ações da IA (desfazer), uso e teto em Ajustes.

**Decisão de 27/11/2026** (spec `docs/superpowers/specs/2026-11-27-glife-ia-agente-design.md`): agente no aparelho
com **DeepSeek Flash** pelo Vercel AI SDK (mesmo do guf_backend); a Edge Function `ai-agent` só faz a ponte (MFA,
teto em dólar (US$ 2,00/mês, sem cotação), limpeza de dados pessoais). Criar/editar direto com "Desfazer"; lixeira, dinheiro e lote com "Confirmar?";
a caixa de entrada segue a mesma regra. Excluir é sempre lixeira. Substitui o Haiku/Sonnet e o "proposta → Aplicar".

| # | Etapa | Status |
|---|-------|--------|
| 6.1 | Fundação: domínio `ai`, `ai-agent`, uso/teto, executor, registro de ações, tela Glife IA, notas e agenda | 🟡 código e testes prontos; falta publicar (secrets, migração, deploy) e testar as frases (`docs/ia/frases-de-teste.md`) |
| 6.2 | Finanças, investimentos e compras (análises de gastos e economia) | ⏳ |
| 6.3 | Dieta e Bíblia | ⏳ |
| 6.4 | Caixa de entrada e Captura, Conversas, Ações da IA, Ajustes (teto e uso) | ⏳ |

- Estimativa de calorias pela foto da refeição (proposta, o usuário confirma) — depois da Fase 5.

## Fase 7 — Segurança nível 2, backup e exportação (≈ 2 semanas)

Telas do protótipo: Exportar tudo (Ajustes), Nota trancada (abrir, aberta, trancar), aparelhos conectados (Segurança).

- GitHub Actions: `pg_dump` noturno criptografado (age), keep-alive diário, CI (lint + testes).
- Exportar tudo (.zip com .md, CSV, JSON); teste de restauração.
- SQLCipher (OP-SQLite) com chave liberada por biometria/senha; “nota trancada” (E2E opcional).
- Skill `revisao-seguranca` executada antes do release.

---

## Decisões tomadas na implementação

- **Expo SDK 58** (o mais recente; o planejamento citava o 56). Rotas ficam em `apps/app/src/app/` e features em `apps/app/src/features/` (padrão `src/` do SDK 58).
- **Estilo com `makeStyles` + tokens tipados em vez de NativeWind.** NativeWind 5 ainda está em RC e o 4 não acompanha RN 0.88/React 19.3 com segurança. Os tokens continuam num único arquivo e o ESLint barra cores hex fora dele; dá para adotar NativeWind 5 depois sem mexer nos tokens.
- **pnpm** com `node-linker=hoisted` (mais compatível com React Native).
- Web exportado como SPA (`web.output: single`), ideal para Cloudflare Pages.
- **Redesign Cobalto (26/11/2026):** o design system Glife Cobalto v1.0 substitui o Glaciar/Sinóptico (itens 0.3 e
  0.4 serão refeitos na Fase R). O redesign do que já existe vem antes das Fases 4–7.

**Decisões pendentes com o usuário (antes da R.2):**
- Aba **IA** antes da Fase 6: mostrar a tela da IA com "chega em breve" ou ocupar a vaga com outra aba até lá.
- Tema escuro derivado no protótipo (o design system só traz o claro): validar em aparelho real.
- Fonte serifada (Literata) só para leitura bíblica e devocional, ou Outfit em tudo como no design system.

## Progresso

- [x] Plano de implementação
- [x] 0.1 Monorepo pnpm
- [x] 0.2 App Expo SDK 58 + Router + TS (build web compilando)
- [x] 0.3 Design system: tokens, fontes, claro/escuro, componentes base (prévia em Ajustes)
- [~] 0.4 Navegação: 4 abas + botão da caixa de entrada no web; falta validar Android
- [x] 0.5 Domain: core, links (URIs, wikilinks, diff), bible (refs pt-BR → OSIS) — 55 testes
- [x] 0.6 ESLint de fronteiras (verificado com violações propositais)
- [~] 0.7 Supabase: config local + 3 migrações com RLS validadas (PGlite). **Falta:** criar projeto na nuvem e aplicar
- [~] 0.8 PowerSync: sync rules escritas. **Falta:** conta, SDK no app, conector
- [x] 0.9 Edge Function usando o domain, testada com Vitest e executada em Deno (import map local)
- [x] 0.10 CLAUDE.md + 6 skills
- [ ] 0.11 APK local (precisa do Android SDK)
- [~] 0.12 Login e-mail + senha + MFA implementado (T8). **Falta:** testar com a conta real e no Android
- [~] 0.13 Componentes, demo e navegação concluídos e validados no web; falta validação Android
- [x] Fronteira de dados no lint: Supabase/PowerSync só em `features/*/data` e `shared/lib`
- [x] Nome Glife: pasta `glife/`, pacotes `@glife/*`, esquema `glife://` e identificadores `app.glife.pessoal`
- [x] Retomada preservada: histórico Git verificado, backup dos commits e documentos externos com SHA-256;
  orientação vigente do usuário registrada (telas básicas podem avançar, prototipagem fica pendente)
- [x] 2.1 `domain/finance`: money, calendário, fatura do cartão, parcelas, cartão já em uso, recorrências (UUID v5),
  saldo, orçamento pelo mês pago e previsão (design: `docs/superpowers/specs/2026-11-24-financas-modelo-design.md`)
- [~] 2.2 Banco e sync de finanças: migração `20261124000001` + RLS testadas no PGlite, tabelas locais e repositórios
  (memória e SQLite pelo mesmo contrato). **Pendente (configuração externa, usuário):** aplicar a migração no Supabase
  hospedado (`pnpm sb db push --remote`) e republicar o `sync-streams.yaml` no painel do PowerSync (Validate → Deploy)
- [~] 2.3 Telas de Finanças, gráficos, compras, investimentos e gasto do mês em Hoje feitos; falta o usuário testar no Chrome/Android (`PENDENCIAS.md`)
- [x] 3 Agenda, lembretes e dieta em versão básica (26/11/2026)
- [x] Design system Cobalto documentado (`docs/design-system-cobalto/`) e protótipo de todas as telas
  (`docs/prototipos/redesign-cobalto/`, 63 telas e 38 folhas) — 26/11/2026
- [~] Fase R — redesign implementado; falta conferência no aparelho
- [~] Fase R2 — implementação e migrações concluídas; falta publicar Sync Streams e conferir no aparelho
