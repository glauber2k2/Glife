# Investimentos (Fase 2) — prototipadas

Protótipo no Claude Design: `Glife Investimentos.dc.html` (telas em `InvestimentosTela.dc.html`), implementado em
25/11/2026 dentro de `features/finance`. Design: `docs/superpowers/specs/2026-11-25-investimentos-design.md`.

- Modelo: `packages/domain/src/finance/investments.ts` (posição, carteira, fluxos nas contas) e
  `investmentsRepository.ts`; tabelas `investment_assets` e `investment_movements` (migração
  `20261125000002_finance_investimentos.sql`, sync-streams atualizado).
- Cotação automática (ações e FIIs pela brapi, cripto pela CoinGecko): `packages/domain/src/quotes/` (provedores,
  serviço com cache de 30 min), Edge Function `supabase/functions/quotes` (só sessão com MFA; cache em
  `private.market_quotes`), no app `data/quoteRefresher.ts` + `hooks/useInvestments.ts` (pede ao abrir as telas).
- Telas: `/financas/investimentos` (lista), `/financas/investimento/[id]` (detalhe, folha de movimento, menu ⋯),
  `/financas/investimento/novo` e `/financas/investimento/editar/[id]`; entrada pela linha "Investimentos" em
  Finanças → Planejamento, com o patrimônio.

## Diferenças em relação ao protótipo

- **Cotação automática** (pedido do usuário): ações, FIIs e cripto não têm a aba Cotação; o valor é cotas × último
  preço, com "Cotação de dd/mm hh:mm · B3/CoinGecko" e "Atualizar" no detalhe. Por isso o cadastro pede o código
  (B3, conferido na hora) ou a moeda (busca por nome/sigla), e Aporte/Resgate pedem a quantidade. Rendimento
  (dividendo) entra no resultado sem mudar o valor das cotas. O detalhe mostra também Cotas e Preço.
- Conta de Finanças na folha em chips (não lista suspensa), com o saldo e o aviso de saldo insuficiente embaixo.
  Aporte com conta tira do saldo (e aparece no extrato como "Investimento"); não é gasto nem entra no orçamento.
- Valor com o teclado numérico do aparelho (`MoneyField`), sem teclado desenhado.
- Tipo e instituição abaixo do título (o `BackHeader` põe o título logo abaixo do voltar).
- Sem "puxar para atualizar": o `Screen` não tem esse gesto; o "Atualizar" do detalhe força a cotação.
- Encerrar ativo automático resgata todas as cotas pelo preço atual; sem a primeira cotação, não encerra.
- Pendente: conferir as telas rodando (claro/escuro, 360 dp, Android e web) — não foram vistas com dados reais.

## Pendências pequenas (revisão final de 25/11/2026)

Corrigidas no mesmo dia: resgate datado antes do aporte, horário do Postgres com microssegundos, ordem com formatos
de data misturados, ativo automático só com rendimentos aparecendo como encerrado, aviso quando "Atualizar" falha e
`Content-Length` conferido antes de ler o corpo na Edge Function. Continuam adiadas:

- Data de hoje do repositório em UTC (só afeta a série no "Encerrar").
- Preço unitário abaixo de R$ 0,01 aparece como "< R$ 0,01" (detalhe) ou R$ 0,00 (cadastro).
- Posição minúscula (< R$ 0,005) não encerra.
- Cada gravação de cotação relê todos os dados de Finanças; a conferência de ticker não usa o cache do servidor.
- Gravar o preço muda `updated_at` (última gravação vence entre aparelhos) — rever na rotina de alerta de preço.
