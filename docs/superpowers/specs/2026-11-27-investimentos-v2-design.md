# Investimentos v2: painel interativo, ranking, estatísticas e leitura dos números (design)

Protótipo aprovado: **Opção A · Painel** em `docs/prototipos/investimentos-v2/index.html`
(artifact "Glife Investimentos v2"). As opções B e C ficam só como referência.

## Intenção

O usuário quer abrir Investimentos e entender, sem conta de cabeça: quanto tem, quanto cada ativo rendeu desde a
compra (lucro ou prejuízo), como a carteira está dividida frente às metas, o que anda bem no mercado e se um ativo
"vale a pena", com explicação simples dos riscos. Quer também comprar com a cotação à vista, achar o ativo
digitando (opções aparecem enquanto digita) e vincular notas. Tudo intuitivo, interativo e animado, no padrão Cobalto.

## Decisões do usuário (27/11/2026)

1. **Interface: Opção A (Painel).** Uma tela rolável: patrimônio, gráfico de evolução, rosca de alocação (Atual/Meta),
   ranking (Minha carteira/Mercado), leitura da IA, lista de ativos. Detalhe do ativo com abas Resumo, Estatísticas,
   IA e Notas.
2. **Só dados grátis:** brapi (plano grátis) e CoinGecko (chave Demo). Nada de plano pago.
3. **IA:** a Glife IA está sendo feita em outra sessão (branch `fase-6-ia`, spec
   `2026-11-27-glife-ia-agente-design.md`). Investimentos não cria modelo nem Edge Function de IA próprios.

## Limites das fontes grátis (pesquisa de 27/11/2026; confirmar com a chave real antes de construir)

- **brapi grátis:** 15 mil pedidos/mês, **1 ativo por pedido**, cotação atualizada a cada 30 min, **histórico diário
  de só 3 meses**. Dividendos, dividend yield, P/L e o screener são do plano pago (respondem 403). A lista
  `/api/quote/list` (v1) não exige token e ordena por variação do dia, volume e valor de mercado, sem indicadores;
  é v1 e pode ser retirada.
- **CoinGecko Demo:** `/coins/markets` (variação 24 h, 7 d, 30 d e 1 ano), `/coins/{id}/market_chart` com até 365
  dias, `/search` para achar moedas.
- **Testado em 27/11/2026 (sem chave):** `/api/quote/list` responde sem token, com `stock`, `name`, `close`, `change`
  (% do dia), `volume`, `market_cap`, `type` (`stock`, `fund`, `bdr`) e `subType` (ex.: `fii`, `fi-agro`); aceita
  `search` (parte do nome ou código), `sortBy`, `sortOrder`, `type` e `limit`. A lista traz papéis quase sem negócio
  (ex.: alta de 32% com volume 3): o ranking **filtra por volume mínimo** e exclui BDR. Ainda **não testado com a
  chave**: histórico de 3 meses (`range=3mo`); é a primeira tarefa do plano.
- Consequência: estatísticas de 12 meses de ações e FIIs **não existem no primeiro dia**. O app monta um **histórico
  próprio** (guarda o preço de cada dia) e as janelas crescem com o tempo; a tela sempre diz em quanto tempo de dados
  o número se baseia.

## Objetivos

- Painel da Opção A com gráficos que respondem ao toque e animações "curto e gentil".
- Resultado desde a compra por ativo e da carteira (já existe no domain; ganha gráfico com preço médio e aportes).
- Metas de alocação por grupo, editáveis pelo usuário, e comparação Atual × Meta.
- Ranking da carteira (desde a compra) e do mercado (com o que o grátis permite).
- Estatísticas por ativo calculadas do histórico disponível, com explicação ao tocar.
- "Leitura dos números" por ativo e da carteira, montada no domain a partir dos dados, sem modelo de linguagem.
- Botão "Perguntar à Glife IA" que abre a conversa da Fase 6 com o ativo como contexto, quando ela existir.
- Busca de ativo com sugestões enquanto digita (ações, FIIs e cripto) com preço e variação do dia.
- Notas vinculadas na aba Notas, com "Salvar leitura como nota".

## Não objetivos (agora)

- Dividend yield, P/L, P/VP, "consistência desde 2016" e qualquer dado do plano pago da brapi.
- Cotação "ao vivo" de segundo em segundo (o protótipo simulava; o grátis atualiza a cada 30 min).
- Alerta de preço, imposto de renda, importação de nota de corretagem.
- Ferramentas de IA de investimentos (são da etapa 2 da Fase 6, feitas na outra sessão).

## Anti-objetivos

- Recomendar compra ou venda. A leitura mostra números, pontos a favor, pontos de atenção e histórico, sempre com
  "Não é recomendação de compra ou venda".
- Número sem fonte ou sem período: toda estatística diz a janela usada ("com base em 3 meses").
- Gastar a cota da brapi a cada abertura de tela (cache no servidor, como hoje).
- Dados inventados quando a fonte falha: a tela mostra o último dado com a hora, ou some o bloco.

## Abordagens consideradas

**Dados de mercado**
1. **Grátis + histórico próprio (escolhida pelo usuário).** Custo zero; estatísticas começam curtas e crescem.
2. Plano Startup da brapi (≈ R$ 100/mês no anual). Tudo desde o primeiro dia; descartado por custo.
3. Sem ranking de mercado. Mais simples; descartado porque o usuário quer ver o mercado.

**IA na tela do ativo**
1. **Leitura determinística no domain + ponte para a Glife IA (escolhida).** Funciona hoje, sem custo, sem inventar
   número; perguntas abertas vão para a IA da Fase 6, que já terá ferramentas de investimentos.
2. Chamar um modelo direto da aba. Duplicaria a Fase 6 (provedor, teto de custo, limpeza de dados) em paralelo.

## Modelo e servidor

### Migração nova (pede autorização explícita do usuário, AGENTS.md → Segurança)
- `public.investment_targets`: `group` ∈ `fixed_income | stocks | reits | funds | crypto | other`, `percent`
  (inteiro 0–100), padrão `vida_apply_standard`, `unique (user_id, group)` entre vivos, publicação `powersync` e
  `sync-streams.yaml`. Soma = 100 é regra do domain (a tela não salva se não fechar 100).
- `private.market_prices_daily` (servidor, sem sync): `source`, `symbol`, `date`, `close_e8`, PK (source, symbol,
  date). Funções `market_prices_get/put` só para `service_role`, como `market_quotes`.
- `private.market_lists` (servidor, sem sync): `list` (ex.: `b3`, `crypto`), `payload jsonb`, `fetched_at`. Cache da
  lista de mercado e do catálogo de símbolos para a busca.

### Grupos de alocação (domain)
`fixed_income`, `treasury` e `savings` → **Renda fixa**; `stocks` → **Ações**; `reits` → **FIIs**; `funds` →
**Fundos**; `crypto` → **Cripto**; `other` → **Outros**. Cores do gráfico na ordem fixa já validada no protótipo
(daltonismo, claro e escuro); viram tokens `t.colors.chart.*`. Os 6 grupos valem para rosca, metas, chips de tipo do
ranking e leitura de concentração; a lista e o detalhe continuam mostrando o tipo do ativo (8 tipos, ex.: "Tesouro
Direto"), decisão de quem escreveu. Sem meta definida, a rosca só mostra o Atual e o
cartão convida a definir metas.

### Edge Function `quotes` ganha ações (mesmo JWT aal2, validação Zod, sem dados pessoais em log)
- `history { source, symbol }` → série diária. Se não houver dados de hoje, busca no provedor (brapi `range=3mo`,
  CoinGecko `days=365`), grava em `market_prices_daily` e devolve tudo o que a tabela tem (cresce com o tempo).
  No máximo uma busca por símbolo por dia.
- Cada `quotes` já feito também grava o preço do dia em `market_prices_daily` (acumula histórico de graça).
- `market { list, sort }` → ranking do mercado a partir de `market_lists` (cache de 30 min): B3 por variação do dia
  (altas e quedas) e volume; cripto por 24 h, 30 d e 1 ano. Ações e FIIs vêm da mesma lista, separados pelo tipo.
- `search { q }` → até 8 símbolos que casam com código, nome ou parte do nome, sem acento, com preço e variação do dia,
  a partir do catálogo em `market_lists` (renovado 1×/dia). Cripto usa `/search` da CoinGecko com cache.
- Se a brapi retirar a `/quote/list`, o ranking B3 some da tela (sem erro na cara do usuário) e a **busca volta ao
  `lookup` atual por código exato**, para nunca perder o cadastro de ação; fica registrado como risco.

## Regras de cálculo (domain, puro, com testes)

- **Série da carteira** (Patrimônio e Investido por dia): movimentos + preços diários de cada ativo; onde não há
  preço diário, usa o preço do próprio aporte e interpola até o próximo ponto conhecido (regra atual estendida).
- **Estatísticas por ativo** a partir da série diária disponível: retorno na janela (3 meses, 1 ano quando houver),
  oscilação anualizada (desvio-padrão dos retornos diários × √252), maior queda na janela, preço vs preço médio,
  rendimentos recebidos em 12 meses (dos movimentos `income` do usuário) e rendimento sobre o custo. Cada número
  carrega a janela usada; com menos de 20 pregões, a estatística não aparece.
- **CDI de referência:** não há fonte grátis confiável combinada; a primeira versão **não compara com o CDI**
  (o protótipo comparava). Fica como melhoria (Banco Central/SGS é grátis e pode entrar depois).
- **Leitura dos números** (`packages/domain/src/finance/insights.ts`): perguntas `desde`, `aporte`, `historico`
  ("o que o passado mostra", substitui "chance de retorno"), `riscos`; e da carteira `carteira`, `melhor`,
  `concentracao`. Saída em blocos (texto, lista a favor/atenção, números, faixa, barra de alocação antes/depois)
  e sempre o aviso. Simulação de aporte usa R$ 1.000 e mostra o novo preço médio e o efeito na meta.
- **Ranking da carteira:** % desde a compra (regra atual), barras divergentes.

## App (feature `finance`, regras do AGENTS.md)

- **Investimentos:** como a Opção A. Gráfico com toque/arraste (cruz + dica) e períodos 1M · 6M · 1A · Tudo; rosca
  com toque por grupo e Atual/Meta; "Definir metas" abre uma folha com um `Input` numérico por grupo e a soma ao vivo;
  ranking com `SegmentedControl` e chips de métrica e tipo; cartão "Leitura" (carteira) que abre a leitura numa folha;
  lista com mini gráfico e ordenação Valor · Resultado · Nome.
- **Detalhe do ativo:** topo com valor, resultado e "Cotação de hh:mm · fonte"; cartão de posição; abas Resumo
  (gráfico com linha do preço médio e marcas de aporte; movimentos), Estatísticas (blocos que explicam ao tocar),
  IA (leitura + "Perguntar à Glife IA"), Notas (`LinkedNotesField` existente + "Salvar leitura como nota").
- **Busca com sugestões** no "Novo ativo" e no "Aporte" de ativo automático: `Input` com lista que aparece ao digitar
  (atraso de 250 ms, mínimo 2 letras), setas/Enter no web, toque no celular, destaque do trecho que casou, estado
  vazio que explica o que digitar. Escolher preenche código, nome e preço do dia.
- **Gráficos:** `react-native-svg` (já usado? confirmar; senão `npx expo install react-native-svg`), animação com
  Reanimated; arraste via `react-native-gesture-handler`. Nada de hex solto: tokens novos.
- **Ponte para a IA (fora desta branch):** nesta branch o botão "Perguntar à Glife IA" **não aparece** e nada muda
  em `links`. Depois que `fase-6-ia` for juntada, uma tarefa pequena liga o botão à conversa, passando o endereço do
  ativo, que já existe: `glife://asset/<id>` (tipo `asset` em `ENTITY_TYPES`), e uma pergunta inicial.

## Riscos

- A `/quote/list` v1 da brapi pode sumir (ranking B3 e busca B3 dependem dela).
- Limites do grátis podem mudar; tudo passa pelo `QuoteService` para trocar de fonte sem mexer nas telas.
- Leitura determinística pode soar mais confiante que os dados: textos sempre com janela e aviso.
- Duas sessões no mesmo repositório: esta branch (`investimentos-v2`, worktree `../glife-investimentos-v2`) não toca
  em arquivos da IA; a junção com `fase-6-ia` acontece por PR.

## Deixado para quem constrói

Nomes exatos de componentes e hooks; layout fino de cada bloco a partir do protótipo; limites numéricos de cache
além dos citados; textos finais das leituras (pt-BR, sem jargão, revisados com o usuário).
