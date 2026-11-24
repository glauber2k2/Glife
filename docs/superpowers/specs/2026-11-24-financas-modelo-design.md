# Finanças — modelo de dados, cartão com fatura e previsão (design)

Data: 2026-11-24 · Fase 2 do `PLANO_DE_IMPLEMENTACAO.md` · Pré-requisito já pronto: `domain/finance/money.ts`.

## Intenção

Controle financeiro pessoal que serve para **planejar**, não só registrar: o que já aconteceu (realizado) e o que vai
acontecer (previsto) — salário que entra todo dia 10, boleto agendado, fatura do cartão. O cartão de crédito **age como
cartão**: fechamento, vencimento e fatura. O orçamento fala a mesma língua do caixa: cada gasto conta no mês em que o
dinheiro sai da conta.

## Decisões do usuário (24/11/2026)

1. **Cartão com fatura** (não "conta simples"): dia de fechamento e de vencimento; compra cai na fatura certa; parcelas
   caem em faturas seguidas; pagar a fatura é uma transferência da conta corrente para o cartão, ligada à fatura.
2. **Orçamento pelo mês em que é pago**: compra no cartão conta no mês do **vencimento da fatura**; cada parcela no mês
   da fatura dela. Fora do cartão, conta no mês da data da transação.
3. **Previsão de gastos e ganhos**: recorrentes (salário dia 10, aluguel, assinatura) e avulsos agendados (boleto em
   15/12). Faturas abertas entram na previsão no vencimento. Mostrar realizado × previsto e saldo projetado, também em
   meses futuros.
4. **Previsto espera confirmação**: no dia, aparece em Hoje; confirma com um toque, **podendo corrigir o valor**; se o
   dia passa sem confirmação, fica **atrasado**. Saldo real só muda com o que foi confirmado.
5. **Abordagem 1 (regra calculada)** — ver "Abordagens".

## Objetivos

- Tabelas `accounts`, `categories`, `transactions`, `recurrences`, `budgets` no padrão do projeto (RLS
  `vida_apply_standard`, FK composta, `deleted_at`, publicação `powersync`, `sync-streams.yaml`).
- Regras puras no `domain/finance` (com testes): fatura de uma compra, parcelas em faturas, expansão de recorrências,
  mês de orçamento, saldo real e projetado, situação da fatura e do previsto (atrasado).
- Repositórios (interface no domain, implementação PowerSync em `features/finance/data`) e contrato em `@glife/domain/testing`.
- Registro dos tipos `glife://tx` e `glife://account` na feature `links`.

## Não objetivos (agora)

Telas (vêm depois, com pergunta de protótipo); gráficos; investimentos e compras (outras etapas da Fase 2); importar
extrato/open banking; várias moedas; subcategorias; dividir uma transação em várias categorias; travar pelo limite do
cartão; anexos (nota fiscal vem com a galeria); busca FTS de transações (fica para a etapa das telas).

## Anti-objetivos (seria fracasso mesmo funcionando)

- Valor em float em qualquer ponto (sempre centavos inteiros).
- Previsão ou ocorrência **duplicada** entre celular e web offline.
- Mudar o dia de fechamento e compras antigas trocarem de fatura.
- Contar duas vezes: compra no cartão **e** pagamento da fatura como gasto.
- Previsto alterando o saldo real sem confirmação.

## Abordagens consideradas

1. **Regra + ocorrências calculadas (escolhida).** Recorrência é uma regra; o domain calcula as ocorrências na hora.
   Só vira linha ao confirmar, pular ou editar um mês, com **id determinístico** (regra + data) — dois aparelhos
   offline geram o mesmo id, sem duplicata. Fatura também é calculada. Custo: somas do mês juntam realizado + regras
   expandidas no domain, não numa consulta SQL simples.
2. **Gravar previsões antecipadas (12 meses).** Somas simples, mas mudar o salário reescreve linhas futuras, aparelhos
   offline geram duplicatas e precisa de rotina para "esticar" o horizonte. Descartada.
3. **Misto.** Na prática a 1 já é isso: avulso agendado é só uma transação com status `planned`, sem regra.

## Modelo

Datas de calendário como texto `YYYY-MM-DD` (sem fuso; o dia é o do usuário). Mês como `YYYY-MM`. Valores em
`amount_cents` **positivos** (> 0); o sentido vem do `type`. Todas as tabelas com `id, user_id, created_at,
updated_at, deleted_at`.

**accounts** — `name`, `kind` (`checking` conta corrente, `savings` poupança, `cash` carteira, `credit_card`),
`initial_balance_cents` (inteiro, pode ser negativo; cartão = 0), `archived` (bool). Só cartão:
`closing_day` e `due_day` (1–31), `credit_limit_cents` (opcional, só exibição), `payment_account_id` (conta que
costuma pagar a fatura; FK composta opcional, `on delete set null`). `check` garantindo que esses campos só existam
(e `closing_day`/`due_day` sejam obrigatórios) quando `kind = 'credit_card'`.

**categories** — `name`, `kind` (`expense` | `income`), `color` (chave de uma paleta de tokens de categoria, nunca
hex), `icon` (nome Lucide), `archived`.

**transactions** — `type` (`expense` | `income` | `transfer`), `status` (`planned` | `confirmed` | `skipped`),
`amount_cents`, `date`, `account_id` (obrigatório), `to_account_id` (só `transfer`, ≠ `account_id`), `category_id`
(opcional; nulo em transfer), `description`, `invoice_month` (`YYYY-MM`, preenchido **na criação** quando `account_id`
é cartão — compra/estorno — ou quando `to_account_id` é cartão — pagamento de fatura), `installment_of` (id da 1ª
parcela; a 1ª aponta para si mesma), `installment_index`, `installment_count`, `recurrence_id` + `occurrence_date`
(quando a linha materializa uma ocorrência).

**recurrences** — mesmo "molde" de uma transação (`type`, `amount_cents`, `account_id`, `to_account_id`,
`category_id`, `description`) + `frequency` (`weekly` | `monthly` | `yearly`), `interval` (≥ 1), `start_date`,
`end_date` (opcional). Dia do mês vem de `start_date`; dia 31 em mês curto cai no último dia.

**budgets** — `category_id`, `starts_month` (`YYYY-MM`), `amount_cents`. Vale do mês indicado em diante até haver um
registro mais novo para a mesma categoria. Único por `(user_id, category_id, starts_month)` entre os não excluídos.

## Regras (domain/finance)

- **Fatura de uma compra:** data da compra < data de fechamento do mês → fatura que fecha naquele mês; senão, a do mês
  seguinte. Vencimento = primeiro `due_day` depois do fechamento. `invoice_month` = mês do **vencimento**. Dias
  29–31 inexistentes viram o último dia do mês. O valor é gravado e não se recalcula.
- **Parcelas:** `splitInstallments` (já pronto) + uma linha por parcela, `invoice_month` avançando um mês por parcela,
  `date` da parcela = data da compra (a 1ª) e mesma data nos meses seguintes. Máx. 120.
- **Mês de orçamento:** `invoice_month` se houver; senão o mês de `date`. Transferências nunca contam no orçamento;
  `skipped` nunca conta.
- **Fatura (calculada):** total = compras − estornos do cartão naquele `invoice_month` (status ≠ skipped); pago =
  transferências para o cartão com aquele `invoice_month`; situação: `aberta` (antes do fechamento), `fechada`,
  `paga`, `parcial`, `vencida`. Fatura não paga entra na previsão como saída da `payment_account_id` no vencimento
  (sem linha gravada; ao pagar, o usuário cria a transferência).
- **Ocorrências:** expandir a regra no intervalo pedido; para cada data, se existir transação com
  `(recurrence_id, occurrence_date)`, ela vence a ocorrência calculada (confirmada, pulada ou editada). Id da linha
  materializada = UUID v5 determinístico de `recurrence_id + occurrence_date` (namespace fixo no domain).
- **Confirmar previsto:** muda `status` para `confirmed`, permitindo trocar `amount_cents` e `date`. Atrasado =
  `planned` (gravado ou calculado) com data < hoje.
- **Saldo real** de uma conta = inicial + entradas − saídas confirmadas (transfer conta nas duas pontas). Cartão: saldo
  = compras − estornos − pagamentos (dívida). **Saldo projetado** até a data D = saldo real + previstos (gravados,
  ocorrências calculadas e faturas em aberto) com data ≤ D, incluindo atrasados.
- **Editar regra:** muda só ocorrências calculadas (futuras e não materializadas); linhas já confirmadas não mudam.
  "Encerrar" = preencher `end_date`.

## Decisões tomadas na revisão (chamadas do Claude — o usuário pode corrigir)

- **Sem contagem dupla no cartão:** previstos do cartão (avulsos e ocorrências de recorrência com `account_id` cartão)
  entram no **total projetado da fatura**, nunca direto no saldo da conta que paga. A conta que paga só sente o cartão
  pela fatura (valor restante = total − pago, no vencimento).
- **Parcelas nascem `confirmed`** (a compra aconteceu). Não ficam "atrasadas". Dívida do cartão = todas as compras
  confirmadas − estornos − pagamentos (inclui parcelas futuras, como o "limite usado" do banco); cada fatura soma só as
  parcelas do seu `invoice_month`.
- **Sem passado fantasma:** ocorrências calculadas só a partir da data de criação da regra (ou `start_date`, o que for
  mais tarde). Não existe atraso anterior à regra.
- **Editar regra = "este e os próximos":** a regra antiga ganha `end_date` no dia anterior à data escolhida e nasce uma
  regra nova a partir dela. Ocorrências passadas e linhas já gravadas não mudam; sem linhas órfãs.
- **Estorno:** `income` no cartão com categoria **de despesa** (abate o gasto daquela categoria no orçamento do mês da
  fatura). Fora isso, `expense` exige categoria `expense` e `income` exige categoria `income`.
- **Mudança de fechamento/vencimento:** `invoice_month` gravado não muda (nem de previstos); situação e vencimento das
  faturas são calculados com os dias atuais do cartão.
- **Pagamento de fatura:** sugere a fatura fechada mais antiga com valor restante. Pago ≥ total → `paga`; excesso fica
  como crédito no saldo do cartão (não migra sozinho para a próxima fatura). `payment_account_id` é **obrigatório**
  em cartão.
- **Excluir ocorrência gravada:** a ocorrência volta a ser calculada (excluída não vence a regra); para "não vai
  acontecer este mês" a ação é **pular** (`skipped`). Regravar a mesma ocorrência faz upsert pelo id e limpa `deleted_at`.

## Cartão já em uso (decisão do usuário, 24/11/2026)

No cadastro do cartão, a pessoa escolhe:
- **Trazer o que já existe (padrão):** valor da **fatura atual em aberto** → uma `expense` "Saldo anterior", sem
  categoria, naquele `invoice_month`; e **parcelamentos em andamento** ("Geladeira · R$ 250 · parcela 4 de 10") → o
  domain cria só as parcelas que faltam (4..10), `installment_index` começando em 4, cada uma na fatura certa a partir
  da atual. O valor informado é o **da parcela** (não o total).
- **Começar do zero:** cartão sem nenhum lançamento; compras antigas lançadas à mão, se quiser.

Por isso `installment_index` pode começar acima de 1 (o grupo continua identificado por `installment_of`), e
`expense` sem categoria é permitida (aparece como "Sem categoria" no orçamento).

## Restrições do projeto

Migração nova (nunca editar as antigas), testada no PGlite; FK composta `(x_id, user_id)`; `check`s de domínio no SQL
espelhando o Zod; publicar em `powersync` e no `sync-streams.yaml` (o usuário republica no painel). Domain sem
React/Supabase/PowerSync, imports `.ts`. Telas não conhecem o banco.

## Deixado para quem constrói

Nomes exatos de funções e arquivos; índices; formato da paleta de cores de categoria; se `installment_of` da 1ª parcela
aponta para si ou fica nulo (manter consistente); como o repositório expõe consultas por mês; categorias sugeridas
(decidir na etapa das telas, evitando duplicata entre aparelhos).
