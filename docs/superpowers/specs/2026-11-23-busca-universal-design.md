# Busca universal — desenho

Aprovado pelo usuário em 23/11/2026 (abordagem recomendada: índice FTS5 no banco local).

## Por quê

Item da Fase 1 do plano: achar qualquer coisa do app num lugar só (Ctrl+K no web) e disparar ações
("Nova nota", "Ir para Finanças"). Hoje só a lista de notas busca, varrendo tudo em JavaScript.

## Objetivos

- Uma busca que ignora acentos e maiúsculas ("cafe" acha "Café"), casa início de palavra e ordena por relevância
  (título pesa mais que o corpo), com trecho do corpo destacando o termo.
- Cobre agora: notas (FTS5), pastas e tags (poucas linhas, filtradas em JS) e ações fixas.
- Cresce sem reescrever: cada módulo novo entrega a sua "fonte de busca"; a tela não muda.
- Abre por Ctrl+K (web) e por ícone de lupa no topo de Hoje e Notas. Campo vazio mostra notas recentes e ações.

## Não objetivos

- Trocar a busca da lista de notas (`NotesRepository.list({search})`) — segue como está.
- Buscar finanças, Bíblia, agenda (módulos ainda sem dados).
- Animação "card que vira tela" e visual final — prototipagem pendente (`docs/prototipos/busca.md`).

## Anti-objetivos

- Deixar texto pessoal no aparelho após sair: o índice é apagado junto com o banco local.
- Busca que quebra com aspas, `*`, `-`, `OR` digitados: a entrada vira consulta FTS segura, nunca SQL/FTS cru.
- App que não abre se o FTS5 faltar: sem o índice, a busca de notas cai para a varredura atual.

## Abordagens consideradas

1. **FTS5 no SQLite local (escolhida).** Rápido em escala, sem acento, ranking e trecho prontos. Custa gatilhos
   sobre as tabelas internas do PowerSync e trocar o SQLite dos testes (sql.js não tem FTS5).
2. Varredura em JS com normalização de acentos. Simples, mas lenta com o crescimento e seria refeita.

## Como (decidido)

- **Índice:** tabela `search_notes_v1` (FTS5, `tokenize='unicode61 remove_diacritics 2'`, colunas `title`, `body`)
  com `rowid` = `rowid` de `ps_data__notes`. Gatilhos AFTER INSERT/UPDATE/DELETE em `ps_data__notes` leem
  `json_extract(data, '$.title' | '$.body_md')`. O INSERT apaga antes o mesmo rowid. A consulta junta por
  `rowid` com `ps_data__notes` e depois com a view `notes` (filtra `deleted_at`), então entradas órfãs de um
  `REPLACE` do sync nunca aparecem.
- **Instalação:** `ensureSearchIndexes(db, specs)` idempotente, chamada quando o acesso fica `ready`: se a tabela
  ou algum gatilho faltar (ou a versão mudou), apaga e recria tudo e preenche a partir de `ps_data__*`. Detecta
  FTS5 ausente e devolve `available: false`. Em `signed_out`, `dropSearchIndexes` apaga os índices.
- **Android:** `"op-sqlite": { "fts5": true }` no `package.json` do app (o web já tem FTS5 no wa-sqlite).
- **Domain `search/`** (TS puro): `toFtsQuery` (tokens → `"tok"*` unidos por AND, aspas escapadas, vazio → null),
  `normalizeText` (sem acento, minúsculas), `matchActions`, tipos `SearchHit`/`SearchSource`/`SearchAction`,
  `mergeResults` (agrupa por grupo, ordem fixa Ações → Notas → Pastas → Tags).
- **Fontes por feature:** `notes` exporta `createNotesSearchSource(db, fallbackRepo)` e a spec do índice; `links`
  exporta a fonte de tags; pastas vêm de `notes`. Cada hit traz `href` (a feature conhece as próprias rotas).
- **Feature `search`:** tela `busca` (modal), `SearchProvider` recebendo fontes e ações da raiz (`_layout`), atalho
  Ctrl+K no web. Não importa outras features; a composição fica na raiz.
- **Testes:** SQLite dos testes passa a ser `node:sqlite` (Node 24, com FTS5) e imita o PowerSync
  (`ps_data__<t>(id, data)` + view com INSTEAD OF), para os gatilhos serem testados contra o formato real.

## Fica para o construtor

Layout fino da tela (dentro do design system), quantos resultados por grupo (proposta: 5 ações, 20 notas,
5 pastas, 5 tags), debounce (proposta: 120 ms).
