# Botão central da Glife IA, anexos, versículos e previsto — plano

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (escolhido: execução nativa nesta sessão,
> revisão independente da branch no fim). Passos com `- [ ]`.

**Goal:** implementar o design `docs/superpowers/specs/2026-11-28-ia-central-e-ajustes-design.md`.
**Architecture:** regras puras no `packages/domain` (refs em texto, limites de anexo, gestos); telas nas features
donas; `shared/navigation/TabBar` recebe o botão central por prop; PDF lido por Edge Function `extract-text`.
**Tech Stack:** Expo SDK 58, Expo Router, Reanimated 4, gesture-handler 3.3, `expo-speech-recognition@58.0.1`,
`expo-document-picker`, Deno + `unpdf@2.1.0`, vitest.

## Global Constraints

- Só tokens de `t.*` (nada de hex ou número solto); textos pt-BR; Lucide contorno; sombra só no que flutua.
- Reduzir movimento: animações viram esmaecer de `t.motion.reduced`.
- Anexo: PDF/TXT/MD/CSV; 60.000 caracteres por anexo; 3 por mensagem; 120.000 por mensagem; PDF até 10 MB.
- `MAX_BODY` da `ai-agent` = 400.000.
- Texto do pedido nunca vai na URL. Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

1. Referência no fim do versículo seguida de pontuação ("Joel 2:32.") ou lista "Lucas 10:7; Levítico 19:13" → cada uma vira link próprio.
2. Palavra comum parecida com livro ("Atos 2", "Jó 1" sem `:`) não vira link; só `cap:vers`.
3. Soltar o dedo antes de 250 ms = toque (abre o compositor), não grava.
4. Sem permissão de microfone → aviso e compositor de texto, sem travar o botão.
5. Arquivo acima do limite → é cortado com aviso, nunca derruba o envio; PDF sem texto (escaneado) → aviso claro.

---

### Task 1: Referências cruzadas no versículo
**Files:** Create `packages/domain/src/bible/findRefs.ts` (+ teste `__tests__/findRefs.test.ts`), export no `bible/index.ts`;
Modify `apps/app/src/features/bible/components/VerseRow.tsx`.
**Produces:** `findBibleRefs(text: string): { start: number; end: number; ref: BibleRef }[]`.
- [ ] Testes: "…de esquina, Salmo 118:22" → 1 ref PSA 118:22; "Lucas 10:7; Levítico 19:13" → LUK 10:7 e LEV 19:13;
  "1 Reis 19:18" → 1KI; "Joel 2:32." (ponto no fim) → end antes do ponto; "Jo 3:16-18" → verseEnd 18;
  "Atos 2" e "capítulo 3:4" (livro inexistente) → nenhuma.
- [ ] Implementar: regex com nomes e abreviações do catálogo de livros (normalizado sem acento), exige `cap:vers`.
- [ ] VerseRow: segmentos; ref vira `<Text tone="accent" onPress>` que faz `router.push` para o capítulo com `?v=`.
- [ ] Rodar testes, commit `feat(biblia): referências no texto do versículo viram links`.

### Task 2: Troca de capítulo suave
**Files:** Modify `apps/app/src/features/bible/screens/ReaderScreen.tsx`.
- [ ] `go()` usa `router.setParams({ livro, cap, v: undefined })`; direção guardada em ref do `ReaderScreen` e passada ao `Reader`.
- [ ] Coluna de texto entra com esmaecer + `t.motion.enterOffset` na direção, `t.motion.gentle`, `t.easing.enter`
  (reduzir movimento: só esmaecer). Barras não animam.
- [ ] Commit `feat(biblia): troca de capítulo suave, sem deslizar a tela`.

### Task 3: Saldo esperado no Início
**Files:** Modify `apps/app/src/features/finance/components/charts/SummaryBlocks.tsx` (TodayFinanceBlock).
- [ ] Linha "Esperado em DD/MM: R$ X" com `monthOverview(...).expected`; some sem contas. Teste no bloco.
- [ ] Commit `feat(financas): saldo esperado no cartão do Início`.

### Task 4: Botão da Glife IA no centro
**Files:** Create `packages/domain/src/ai/holdGesture.ts` (+ teste), `apps/app/src/features/ai/pendingPrompt.ts`,
`apps/app/src/features/ai/components/GlifeAiButton.tsx`, `.../components/AiComposer.tsx`, `.../components/VoiceBar.tsx`,
`.../data/speech.ts`, `apps/app/src/app/ia.tsx`, `apps/app/src/app/(tabs)/financas.tsx`;
Modify `shared/navigation/TabBar.tsx` (prop `center`), `app/(tabs)/_layout.tsx`, `app/_layout.tsx` (rota `ia`), `AiChatScreen` (sem `tabBar`, com voltar, consome pedido pendente), `app.json` (plugin de voz).
**Produces:** `holdGesture` reducer: estados `idle|pressing|recording|locked`; eventos `down(t)`, `move(dy)`, `up(t)`, `tick(t)`;
saídas `openComposer|startVoice|sendVoice|lock|cancel`. `HOLD_MS = 250`, `LOCK_DY = 64`.
`setPendingPrompt(text: string)`, `takePendingPrompt(): string | null`.
- [ ] Testes do reducer: soltar < 250 ms → openComposer; segurar ≥ 250 → startVoice; soltar gravando → sendVoice;
  arrastar 64 para cima → lock; soltar travado → nada; cancelar.
- [ ] Testes do pedido pendente (pega uma vez só).
- [ ] UI + voz (`expo-speech-recognition`, `lang: 'pt-BR'`, `interimResults`, `continuous`); sem permissão → aviso + compositor.
- [ ] Commit `feat(ia): botão da Glife IA no centro da barra com texto e voz`.

### Task 5: Anexos na conversa
**Files:** Create `packages/domain/src/ai/attachments.ts` (+ teste), `supabase/functions/extract-text/{index,handler}.ts`,
`supabase/tests/extractText.test.ts`, `apps/app/src/features/ai/data/attachments.ts`; Modify `ai-agent/request.ts`
(`MAX_BODY`), `deno.json` (`unpdf`), `AiChatScreen`/`AiComposer` (botão de anexo, chips), `useAgentChat.send(text, attachments)`.
**Produces:** `ATTACH = { perFile: 60_000, perMessage: 120_000, maxFiles: 3, pdfBytes: 10_000_000 }`,
`attachmentPart(name, text): string` (prefixo `[Anexo: nome]\n`), `parseAttachmentPart(text)`, `fitAttachments(list)` → cortes e avisos.
- [ ] Testes de limites e do prefixo; testes do handler (405, 401 sem aal2, 413, 415 tipo, 200 com texto, PDF sem texto → 422).
- [ ] Commit `feat(ia): anexar PDF, TXT, MD e CSV na conversa`.

### Task 6: "Perguntar à Glife IA" no ativo
- [ ] Botão do detalhe do ativo chama `setPendingPrompt` com pedido sobre o ativo e abre `/ia`. Commit.

### Task 7: Fechamento
- [ ] `pnpm lint && pnpm typecheck && pnpm test`; conferir no navegador o que não exige login; revisão independente;
  PENDENCIAS.md (APK novo, publicar `extract-text` e `ai-agent`) e STATUS.md.
