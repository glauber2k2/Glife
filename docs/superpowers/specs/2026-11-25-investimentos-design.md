# Investimentos com cotação automática (design)

Data: 2026-11-25 · Fase 2 do `PLANO_DE_IMPLEMENTACAO.md` · Protótipo: Claude Design `Glife Investimentos.dc.html`
(telas em `InvestimentosTela.dc.html`), resumido em `docs/prototipos/investimentos.md` ao implementar.

## Intenção

Acompanhar o patrimônio investido dentro de Finanças: quanto foi investido, quanto vale hoje e quanto rendeu, por
ativo e no total. O usuário lança aportes, resgates e rendimentos à mão (sem integração com corretora), mas **não quer
digitar cotação** de ativos negociados em mercado: ações, FIIs e cripto se atualizam sozinhos ao abrir qualquer tela que
mostre o valor. O desenho deve permitir, no futuro, **alerta de preço** (aviso quando um ativo passa de um valor).

## Decisões do usuário (25/11/2026)

1. Telas conforme o protótipo `Glife Investimentos` (lista, detalhe, folha de movimento, novo/editar ativo).
2. **Escopo do automático = opção A:** Ações, FIIs e Cripto com cotação automática; Renda fixa, Tesouro Direto,
   Fundos, Poupança e Outro continuam com a **Cotação manual** do protótipo.
3. **Busca sob demanda por Edge Function (abordagem 1):** o app chama a função `quotes`, que guarda as chaves e um cache
   de 30 min. A busca acontece **ao abrir qualquer tela que mostre valor de ativo ou rendimento** (lista de
   Investimentos, detalhe do ativo, linha de Investimentos em Finanças e, quando existir, Hoje).
4. **Preparar para alerta de preço:** provedores e cache do servidor reutilizáveis por uma futura rotina agendada.

## Objetivos

- Tabelas `investment_assets` e `investment_movements` no padrão do projeto (RLS `vida_apply_standard`, FK composta,
  `deleted_at`, publicação `powersync`, `sync-streams.yaml`) + tabela de servidor `private.market_quotes` (cache, não sincroniza).
- Regras puras em `domain/finance/investments.ts` (com testes): valor atual, investido, resultado (R$ e %), série do
  gráfico, encerrado, distribuição por tipo, efeito de cada movimento (linha de ajuda da folha).
- Repositório (interface no domain, implementação PowerSync em `features/finance/data`), com "Já tenho este
  investimento" e "Encerrar" gravando tudo ou nada, e desfazer.
- Cotação automática: interface `QuoteProvider` no domain com implementações brapi (ações/FIIs) e CoinGecko (cripto);
  serviço `QuoteService` (cache + roteamento por fonte) usado pela Edge Function `quotes`; no app, `QuoteClient`
  (interface) + hook que atualiza ao focar a tela.
- Telas do protótipo dentro de `features/finance`, entrada pela linha "Investimentos" em Finanças → Planejamento
  (como "Compras"), com o patrimônio total à direita.
- Ativo endereçável como `glife://asset/<id>` (o tipo `asset` já existe em `ENTITY_TYPES`).

## Não objetivos (agora)

Alerta de preço em si (só a preparação); Tesouro por planilha e renda fixa por % do CDI (opções B/C, ficaram fora);
IR/IOF e come-cotas; preço médio e lucro realizado por lote; câmbio e ativos no exterior; integração com corretora/B3;
proventos automáticos; cotação em tempo real de verdade (o grátis da brapi atrasa ~30 min — mostrar o horário).

## Anti-objetivos

- Chave de API no app ou no repositório (vai só nos secrets das Edge Functions).
- Tela travada ou vazia por falta de internet/cota: sempre mostra o último preço conhecido com a data/hora.
- Dinheiro em float; quantidade fracionária perdendo precisão (BTC 0,00012345).
- Aporte com conta contando como gasto do mês ou entrando no orçamento.
- Cada abertura de tela gastando cota da API (cache no servidor e intervalo mínimo no app).
- Ação de várias gravações pela metade ("Já tenho", "Encerrar", desfazer).

## Abordagens consideradas (busca de cotação)

1. **Edge Function sob demanda (escolhida).** App → `quotes` → cache `market_quotes` (30 min) → provedor. O app grava o
   último preço no ativo (sincroniza para os outros aparelhos). Gasta cota só com uso; peças simples; a função escreve
   apenas no cache do servidor.
2. **Rotina agendada no servidor.** Preço sempre fresco, mas gasta cota sem uso e escreve dados de usuário com
   service_role. Fica como caminho futuro para o alerta, **reutilizando** `QuoteService` e `market_quotes`.
3. **App chamando as APIs direto.** Descartada: expõe chaves; brapi sem token cobre só 4 ações; CoinGecko barra CORS.

## Modelo

### `investment_assets`
- `name` (1–120, uma linha), `kind` ∈ `fixed_income | treasury | stocks | reits | funds | savings | crypto | other`
  (rótulos: Renda fixa, Tesouro Direto, Ações, FIIs, Fundos, Poupança, Cripto, Outro), `institution` (≤ 80, vazio ok),
  `notes` (≤ 500).
- Cotação automática: `quote_symbol` (texto, nulo em tipos manuais; obrigatório em `stocks | reits | crypto`;
  ações/FIIs em maiúsculas `^[A-Z0-9]{4,12}$`, cripto = id da CoinGecko, ex. `bitcoin`), `last_price_e8` (preço em R$ × 10⁸,
  bigint — cripto barata vale frações de centavo; nulo até a 1ª cotação), `last_price_at` (timestamptz, nulo).
- A fonte é derivada do tipo (`stocks|reits` → brapi, `crypto` → coingecko), não gravada: trocar de provedor não mexe em dados.

### `investment_movements`
- `asset_id` (FK composta), `kind` ∈ `contribution | withdrawal | income | quote` (Aporte, Resgate, Rendimento, Cotação),
  `amount_cents` (bigint; > 0, exceto `income`, que pode ser negativo e ≠ 0), `date` (`YYYY-MM-DD`),
  `account_id` (FK composta opcional, `on delete set null`; só em contribution/withdrawal), `notes` (≤ 200).
- `quantity` em **unidades × 10⁸** (bigint; ex. 100 cotas = 10 000 000 000; 0,00012345 BTC = 12 345): obrigatória em
  contribution/withdrawal de ativo automático, nula no resto. `quote` não existe em ativo automático.
- Checks do banco repetem essas regras (o domain as repete em Zod, como no resto de Finanças).

### `private.market_quotes` (servidor, sem sync)
`source` + `symbol` (PK), `price_e8`, `name` (descrição do provedor), `quoted_at` (horário da cotação no provedor),
`fetched_at`. Fica no schema `private` (fora da API e da publicação `powersync`); a Edge Function lê e grava por duas
funções `public.market_quotes_get(jsonb)` / `public.market_quotes_put(jsonb)` executáveis **só por `service_role`**.
É a peça que a futura rotina de alertas reaproveita.

## Regras de cálculo (domain, puro)

Movimentos ordenados por data (empate: ordem de criação).
- **Investido** = Σ aportes − Σ resgates.
- **Ativo manual:** valor atual começa em 0; aporte soma, resgate subtrai, rendimento soma (com sinal), cotação
  substitui. **Resultado** = atual − investido.
- **Ativo automático:** cotas = Σ quantidade dos aportes − Σ dos resgates; valor atual = cotas × `last_price_e8`
  (arredondado ao centavo, conta em BigInt); sem preço ainda = investido. Rendimento (dividendo) **não** muda o valor
  das cotas. **Resultado** = atual − investido + Σ rendimentos.
- **%** = resultado ÷ investido; se investido ≤ 0 (encerrado/resgatou tudo), ÷ Σ aportes. **Encerrado** = tem
  movimentos e valor atual = 0 (manual) ou cotas = 0 (automático).
- **Série do gráfico:** valor após cada movimento + ponto de hoje (no automático, os pontos passados usam cotas × preço
  do próprio aporte — `amount/quantity` —, e hoje usa `last_price_e8`).
- **Patrimônio** = Σ valor atual dos ativos abertos; distribuição por tipo ordenada do maior para o menor.
- **Linha de ajuda da folha** (efeito no ativo) e aviso de resgate maior que o valor atual, como no protótipo.

## Contas de Finanças

Aporte com conta **diminui o saldo da conta**; resgate com conta **aumenta**. Não vira `transaction` (não é gasto nem
receita, não entra em orçamento nem no resumo do mês). O saldo da conta e o extrato passam a considerar esses
movimentos (extrato mostra "Aporte · <ativo>" / "Resgate · <ativo>"). O aviso de saldo insuficiente usa o saldo atual.

## Cotação automática

### Domain (`packages/domain/src/quotes/`, importado como `@glife/domain/quotes`)
- `QuoteProvider` { `source`, `supports(kind)`, `fetchQuotes(symbols, fetchFn)` → `Quote[]` } — implementações
  `BrapiProvider` (1 ticker por chamada no plano grátis; token por parâmetro) e `CoinGeckoProvider`
  (`/simple/price?vs_currencies=brl`, vários ids numa chamada; chave demo no cabeçalho). `fetch` e chaves injetados.
- `QuoteCache` (interface: `get(keys)`, `put(quotes)`) e `QuoteService` (pega do cache o que tem < 30 min, busca o
  resto no provedor certo, grava no cache, devolve tudo + erros por símbolo). Provedor novo = classe nova registrada.
- Validação Zod da entrada/saída (símbolos ≤ 50 por pedido, formatos acima).

### Edge Function `supabase/functions/quotes`
- `POST { items: [{ source, symbol }] }` → `{ quotes: [{ source, symbol, priceCents, name, quotedAt }], errors: [...] }`.
- Exige JWT válido com `aal = aal2` (mesma regra do resto); valida o corpo; limita tamanho; não registra dados pessoais.
- Secrets: `BRAPI_TOKEN`, `COINGECKO_DEMO_KEY` (o usuário cria as contas e define os secrets). Sem chave da CoinGecko,
  tenta o modo sem chave (limite menor).
- Também atende `lookup` (um símbolo) para o formulário validar o código e mostrar nome + preço antes de salvar.

### App
- `QuoteClient` (interface) com implementação que chama a função pelo cliente Supabase; injetado na raiz `_layout.tsx`.
- Hook `useRefreshQuotes()` usado nas telas que mostram valor: ao focar, busca os ativos automáticos cujo
  `last_price_at` tem mais de 30 min e grava `last_price_e8/last_price_at` pelo repositório. Puxar para atualizar
  força (o cache do servidor ainda vale). Falha = silenciosa na tela, com "Cotação de dd/mm hh:mm" visível; offline não tenta.
- Formulário de ativo automático: campo "Código" (ações/FIIs: ticker; cripto: busca pelo nome/sigla via `lookup`) e,
  em "Já tenho", quantidade + valor investido (o valor atual vem da cotação).

## Telas (protótipo, com as regras do AGENTS.md)

Como no protótipo, com estas diferenças: campos sempre `Input`/`MoneyField` com teclado do aparelho; folha "Novo
movimento" sem a aba Cotação em ativo automático e com o campo Quantidade em Aporte/Resgate desses ativos; detalhe do
ativo automático mostra "Cotação de dd/mm hh:mm · fonte" no lugar de "Última cotação em"; "Encerrar" em ativo
automático gera resgate de todas as cotas pelo valor atual. Todas as diferenças vão para `docs/prototipos/investimentos.md`.

## Decisões de quem escreveu (revisão do construtor)

- **Protótipo:** lido pelo MCP do Claude Design (projeto `e085c8e7…`, arquivos `Glife Investimentos.dc.html` e
  `InvestimentosTela.dc.html`); textos da linha de ajuda e o limite do aviso de resgate (valor > atual) seguem a lógica
  dele. Ao implementar, o resumo e as diferenças vão para `docs/prototipos/investimentos.md`.
- **Contas:** só contas que não são cartão (`checking | savings | cash`) podem ser ligadas. Movimento excluído ou de
  ativo excluído não conta. Conta qualquer data (não há "previsto" em investimento) e não entra em totais do mês,
  orçamento nem previsão — só saldo e extrato. `accountBalance` ganha um parâmetro opcional de fluxos extras (lista de
  `{ account_id, amount_cents }` com sinal), para não mudar as chamadas existentes que não precisam dele.
- **Troca de tipo:** livre dentro do grupo manual e dentro do grupo automático da mesma fonte (Ações ↔ FIIs); entre
  grupos ou de fonte (Ações ↔ Cripto) só sem movimentos — com movimentos, os outros chips ficam desabilitados com a
  explicação. A regra "quantidade obrigatória em ativo automático" fica só no domain (cruza tabelas; trigger
  recusaria uploads offline); o banco só checa o que é da própria linha.
- **Busca de cripto:** por nome ou sigla, pelo `/search` da CoinGecko; `lookup` devolve uma lista (até 8) de
  `{ symbol (id), name, ticker }`; para ações/FIIs a lista tem 0 ou 1 item com o preço.
- **Encerrar sem cotação:** ativo automático sem `last_price_e8` não pode ser encerrado ("Aguardando a primeira
  cotação"); o valor exibido cai para o investido, marcado "sem cotação".
- **aal2 na Edge Function:** não há helper; criar `supabase/functions/_shared/auth.ts` (valida o JWT com o cliente
  Supabase e exige `aal = aal2`), reutilizável pelas próximas funções.

## Deixado para quem constrói

Nomes de arquivos/componentes, divisão dos commits, formato exato das mensagens de erro, layout do campo de busca de
cripto, e como o extrato encaixa os movimentos de investimento (desde que siga as regras acima).
