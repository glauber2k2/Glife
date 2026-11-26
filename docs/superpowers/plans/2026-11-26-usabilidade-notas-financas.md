# Usabilidade de Notas e Finanças — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar os cinco ajustes aprovados e um APK atualizado, preservando dados e padrões do Glife.

**Architecture:** funções puras no domain e adaptadores nas features; reutilizar preferência de visibilidade, repositórios e componentes Cobalto. Encapsular seletores nativos em shared/ui; preservar formatos de data e dinheiro. Execução pelo agente principal com revisão independente do conjunto; a aprovação do usuário já autoriza implementar, testar e gerar APK.

**Tech Stack:** Expo SDK 58, RN 0.88, TypeScript, PowerSync/SQLite, Vitest/PGlite; datetimepicker 9.2.1 pelo expo install.

**Spec:** `docs/superpowers/specs/2026-11-26-usabilidade-notas-financas-design.md`

## Global Constraints

- Dinheiro sempre em centavos inteiros; nenhuma mudança em autenticação, permissões ou migrações.
- Interfaces públicas das features; shared nunca importa features; domain não importa frameworks.
- Tokens Cobalto, pt-BR, campos com no máximo duas colunas, 360 dp, temas claro/escuro.
- Preservar o texto exato do Markdown, inclusive espaços e quebras; não retirar formatação ao vivo.
- Cada commit exige `pnpm lint`, `pnpm typecheck` e `pnpm test` aprovados.
- A assinatura e o pacote Android devem continuar os mesmos. Testes e build nativo em sequência.

## Review Focus

1. Alternar o olhinho da Home não navega e altera a preferência compartilhada.
2. Total de 10.001 centavos em 3 parcelas conserva todos os centavos; modo unitário não multiplica duas vezes.
3. Subpastas com nomes iguais em pais diferentes, pais ausentes e ciclos não somem dos seletores nem travam a navegação.
4. Apagar texto enquanto o cursor ainda aponta ao comprimento anterior não envia seleção inválida ao nativo.
5. Cancelar um picker não muda o campo; datas locais não mudam de dia por conversão UTC.

## Arquivos e responsabilidades

- `domain/finance/money.ts`: resolver entrada total/unitária e distribuição de parcelas.
- `finance/components/InstallmentAmountChoice.tsx`: escolha reutilizável nos dois formulários.
- `finance/components/charts/SummaryBlocks.tsx`: olhinho compartilhado no cabeçalho da Home.
- `domain/notes/folders.ts`: hierarquia, caminhos e destinos válidos, sem recursão infinita.
- `notes/repository.ts` e implementações local/memória: resumos agregados de pastas, sem ler corpos das notas.
- `notes/components/FolderPicker.tsx`: seleção de destino com caminho; criação com parent_id.
- `shared/lib/calendarPicker.ts`: conversão local e resultado de confirmação/cancelamento.
- `shared/ui/CalendarPicker.tsx` e `.web.tsx`: fronteira de plataforma dos pickers; CalendarFields mantém API.
- `notes/components/liveMarkdown.ts`, `LiveMarkdownText.tsx`, `textEdits.ts`: conteúdo estilizado e seleção seguros.

---

### Task 1: Finanças — olhinho na Home e valor total/unitário

**Files:** modificar `packages/domain/src/finance/money.ts`, `index.ts`, `apps/app/src/features/finance/components/charts/SummaryBlocks.tsx`, `NewEntrySheet.tsx`, `PurchaseSheet.tsx`; criar `components/InstallmentAmountChoice.tsx`; modificar `apps/app/src/shared/ui/Section.tsx` apenas se necessário para uma ação acessória; testar `packages/domain/src/finance/__tests__/installmentAmount.test.ts`.

**Interfaces:** produz `InstallmentAmountMode = 'total' | 'installment'` e `installmentAmount(cents: number, count: number, mode: InstallmentAmountMode): { totalCents: number; amounts: number[] }`. Consome `splitInstallments`, `MoneyEyeButton`, `useMoneyVisibility` e gravação em lote atual. `InstallmentAmountChoice` recebe `value` e `onChange` do modo, sem gravar dados.

- [x] Escrever teste com `installmentAmount(10001, 3, 'total')` → `{ totalCents: 10001, amounts: [3334,3334,3333] }`; modo installment com 10001 → total 30003 e três valores 10001; recusar 0/121 parcelas, fração e multiplicação fora de Number.MAX_SAFE_INTEGER.
- [x] Rodar `pnpm --filter @glife/domain exec vitest run src/finance/__tests__/installmentAmount.test.ts`; esperado RED por função ausente.
- [x] Implementar cálculo puro, opção apenas em cartão parcelado sem repetição; o modo mantém os dígitos, muda rótulo e simulação. Ao salvar, usar o total resolvido uma única vez nos fluxos Novo lançamento e Comprei. Recorrências, contas e cadastro de cartão em uso mantêm semântica.
- [x] Colocar `MoneyEyeButton` junto ao título Mês até agora, fora da área que navega; manter ação Gráficos.
- [x] Rodar teste alvo, lint, typecheck e suíte. Esperado tudo aprovado. Commit `feat(financas): olhinho na Home e entrada pelo valor da parcela`.

### Task 2: Notas — subpastas e escolha de destino

**Files:** criar `packages/domain/src/notes/folders.ts`, `__tests__/folders.test.ts`, `apps/app/src/features/notes/components/FolderPicker.tsx`; modificar `notes/index.ts`, `repository.ts`, `packages/domain/src/testing/memory.ts`, `notesContract.ts`, `apps/app/src/features/notes/data/localNotesRepository.ts`, `FoldersScreen.tsx`, `FolderScreen.tsx`, `FolderNameSheet.tsx`, `NoteQuickActions.tsx`, `BulkSheets.tsx`, `NoteEditorScreen.tsx`.

**Interfaces:** `folderPath(folders: readonly NoteFolder[], id: string): string`, `folderChildren(folders: readonly NoteFolder[], parentId: string | null): NoteFolder[]`, `folderDestinations(folders: readonly NoteFolder[], movingId?: string): { folder: NoteFolder; path: string }[]`; produzir `NoteFolderSummary = { folder: NoteFolder; notes: number; children: number }` e `NoteFoldersRepository.listSummaries(): Promise<NoteFolderSummary[]>`. `FolderNameSheet` aceita `parentId?: string | null`. `FolderPicker` recebe pastas, seleção opcional, movingId opcional e onPick(folder|null), sem acessar banco.

- [x] Testar árvore Raiz/A/B; filhos diretos e caminhos distintos; destinos excluem a própria pasta e descendentes; órfãos/ciclos terminam e continuam acessíveis; contratos listSummaries ignoram notas/pastas excluídas e contam além da primeira página de 200.
- [x] Rodar testes de folders e contrato; esperado RED por interfaces novas ausentes.
- [x] Implementar helpers iterativos com conjunto de visitados; agregação SQL e equivalente em memória; usar o contrato nas duas implementações.
- [x] Expor raiz, subpastas, caminho, Nova subpasta e Mover pasta nas telas existentes. Atualizar escolher pasta em nota individual e em lote. Exclusão mantém a promoção existente e retorna ao pai. Recarregar dados ao criar/mover/renomear e ao focar a pasta.
- [x] Rodar testes alvo, lint, typecheck e suíte. Commit `feat(notas): navegar criar e mover subpastas`.

### Task 3: Campos compartilhados — seletores nativos de data e hora

**Files:** criar `apps/app/src/shared/lib/calendarPicker.ts`, `apps/app/tests/calendarPicker.test.ts`, `apps/app/src/shared/ui/CalendarPicker.tsx`, `CalendarPicker.web.tsx`; modificar `CalendarFields.tsx`, `features/finance/components/ui.tsx`, `apps/app/package.json`, lockfile e configuração Expo se necessária.

**Interfaces:** `CalendarPickerProps { mode: 'date'|'time'; label: string; value: string; onChange(value: string): void; error?: string; clearable?: boolean }`. Valores de data seguem dd/mm/aaaa; hora HH:MM. Helpers puros convertem para/de Date local e `pickerResult(mode, eventType, date): string | null` retorna null ao cancelar/receber data inválida. API pública DateInput/TimeInput preservada, com clearable opcional. DateRow adapta ISO ↔ campo público sem alterar seus consumidores.

- [x] Testes: seleção de 31/12/2026 e 09:05, ano bissexto, cancelamento sem alteração e data inválida; data local em meia-noite preservada sem toISOString.
- [x] Rodar `pnpm --filter app exec vitest run tests/calendarPicker.test.ts`; esperado RED por helper ausente.
- [x] Instalar com `pnpm --filter app exec expo install @react-native-community/datetimepicker`, conferindo versão do SDK. Android usa DateTimePickerAndroid.open; iOS controle nativo com confirmação/cancelamento; web input date/time do navegador, encapsulado na mesma API.
- [x] Renderizar campos com visual Input e ação de abrir; limpar opcional explícito; adaptar DateRow e qualquer campo completo de data/hora que ainda só ofereça digitação. Manter dias do mês numéricos. Validar tipos da dependência instalada.
- [x] Rodar testes alvo, lint, typecheck e suíte; exportar web. Commit `feat(ui): abrir seletores nativos nos campos de data e hora`.

### Task 4: Editor — espaços, linhas vazias e seleção

**Files:** modificar `apps/app/src/features/notes/components/liveMarkdown.ts`, `LiveMarkdownText.tsx`, `textEdits.ts`, `screens/NoteEditorScreen.tsx`; testar `apps/app/tests/liveMarkdown.test.ts`, `textEdits.test.ts` e, se necessário, teste estreito da fronteira de renderização nativa.

**Interfaces:** produzir `normalizeSelection(text: string, selection: Selection): Selection` para clamping e ordenação de índices finitos no intervalo 0..text.length; todas as edições retornam `Edit` com seleção válida. `liveSpans` mantém concatenação exata, inclusive UTF-16 e linhas vazias; o componente mantém uma árvore de texto estilizado estável e métricas do corpo nas quebras/trechos sem estilo.

- [x] Confirmar hipótese pelo código do React Native instalado e por reprodução disponível. Registrar no ledger o caminho problemático, a evidência e a limitação de ausência de aparelho; não afirmar reprodução de crash nativo sem tê-la feito.
- [x] Adicionar testes de seleção após encurtar texto, índices fora do intervalo e primeira linha vazia; listas com duas quebras e espaços, CRLF, emoji e formatação depois dessas posições. Esperado RED para os índices inválidos atuais.
- [x] Implementar normalização no recebimento/eventos de seleção e na aplicação das edições. Corrigir o comportamento de trechos de texto nativos conforme a hipótese verificada, preservando texto/formatos, sem inserir caracteres invisíveis ou espaços artificiais.
- [x] Testar alternância entre texto simples/formatado, voltar cursor e excluir caracteres; confirmar concatenação e seleção no intervalo. Rodar testes alvo, lint, typecheck e suíte. Commit `fix(notas): estabilizar espaços e seleção no editor Markdown`.

### Task 5: Revisão, integração e APK

**Files:** `apps/app/app.json`, `docs/CHANGELOG.md`, `STATUS.md`, este plano e especificação aprovada.

**Interfaces:** consome Tasks 1–4 completas; entrega versão 0.6.0/versionCode 6, APK/ZIP e código integrado no checkout original sem publicar Git ou alterar serviços externos.

- [x] Revisão independente parcial do diff `dc2e23f..HEAD` pelo fluxo requesting-code-review, interrompida pela ferramenta por limite de créditos; revisão restante pelo autor. Dois achados importantes conferidos e corrigidos, além do tratamento de erro do picker; testes de comportamento RED→GREEN. Limite de validação nativa registrado no changelog e ledger.
- [x] Atualizar versão/changelog, executar lint/typecheck/test e `pnpm build:web` com saída conferida. Nenhuma suíte em paralelo à compilação nativa.
- [x] Compilar numa cópia curta conforme release-android; preservar debug.keystore anterior; incluir a nova lib com prebuild limpo. Conferidos pacote, versão, assinatura igual à 0.5.0, permissões sem mudanças, bundle e 33 bibliotecas arm64. Gerados `../Glife-0.6.0.apk` e ZIP.
- [ ] Atualizar status (até 10 linhas) e plano, integrar localmente o trabalho autorizado e verificar ausência de pendências desta tarefa, preservando alterações concorrentes. Commit `chore(release): versão 0.6.0 e ajustes de usabilidade`; integrar o histórico paralelo em branch isolada e verificar antes de avançar o checkout original.
