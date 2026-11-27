# Handoff — Bíblia v2 (27/11/2026)

## Objetivo
Levar ao app o protótipo aprovado "Glife Bíblia v2": Bíblia em Outfit, leitor limpo com ajustes, início com busca e
registros, e planos de leitura sincronizados com lembrete. Spec `docs/superpowers/specs/2026-11-27-biblia-v2-design.md`;
plano `docs/superpowers/plans/2026-11-27-biblia-v2.md`.

## Estado atual
- Código pronto e revisado na branch `fase-4-biblia`; PR glauber2k2/Glife#1 aberto contra `master` (sem CI no repo).
- Versão 0.8.0 (versionCode 10); APK em `Desktop/Glauber/Glife-0.8.0.apk` (não instalado nem testado).
- Migrações `20261129000001_biblia_planos.sql` e `…000002_biblia_planos_json.sql` aplicadas no GLIFE (sem dump: Docker
  não subiu; só acrescentam tabelas; `rls_check.sql` = 0 linhas; listas como texto JSON; tabelas na publicação powersync).

## Próximos passos (em ordem)
1. **Republicar `supabase/powersync/sync-streams.yaml` no painel do PowerSync** (Glife → Production → Sync Streams →
   colar → Validate → Deploy). Tentativa pelo navegador falhou: a extensão Claude no Brave não aparece conectada a esta
   conta (lista de navegadores vazia). Sem isso, planos não sincronizam entre aparelhos.
2. Instalar o APK 0.8.0 e conferir no Android e no Chrome (claro/escuro, 360 dp) — roteiro em `PENDENCIAS.md`.
3. Juntar o PR #1 depois da conferência (traz também Fases R/R2 e a 1ª etapa da Fase 4, nunca juntadas).
4. Menores adiados da revisão final (ver abaixo).

## Arquivos-chave
- Leitor: `features/bible/screens/ReaderScreen.tsx`, `components/VerseRow.tsx` (faixas por linha no Android via
  `onTextLayout`; spans com padding no web), `highlightBands.ts`, `ReadingSheet.tsx`, `PassageBar.tsx`, `shared/ui/Slider.tsx`.
- Início/busca/registros: `BibleHomeScreen.tsx`, `BibleSearchScreen.tsx`, `BibleRecordsScreen.tsx`, `data/textIndex.ts`,
  `domain/bible/search.ts`, `records.ts`; `links` ganhou `watchBibleAll`.
- Planos: `domain/bible/plans.ts` (cronograma, situação, avisos), `planRepository.ts`; telas `Plans*`, `PlanCard`,
  `TodayPlans`, `PlanReader`; aviso via `usePlanNotices` + `today/NoticesSync.tsx`.

## Decisões tomadas
- Outfit em tudo (Literata removida); um versículo por linha; dia do plano pelo calendário; plano = regra + leituras.
- Aviso do plano sem botões (só abre `/biblia/planos/<id>`); excluir plano pede confirmação; pausa fecha na véspera.
- Lista de rulings completa na mensagem final da execução (sessão de 27/11).

## Como testar
`pnpm lint && pnpm typecheck && pnpm test` (banco 119, domínio 642, app 559) e `pnpm build:web`.

## Pendências (menores adiados)
Botão Ler/Reler e chips do cartão mudam de largura; `onTextLayout` faz render extra por versículo; busca diz "200" ao
cortar no limite; busca mantém índice antigo ao trocar tradução; cartão do início sem "Recuperar" em plano encerrado;
`reading` recriado a cada `setLast` invalida o memo dos versículos.
