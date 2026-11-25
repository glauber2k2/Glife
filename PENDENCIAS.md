# Pendências do usuário

O que só o dono do projeto pode fazer (contas, chaves, testes no aparelho, decisões). Ao concluir um item, apague-o.

## Agenda e dieta (26/11/2026)

- [ ] Instalar o APK novo (tem biblioteca nativa nova, a de notificações) e permitir as notificações quando o app pedir.
- [ ] Testar: evento com aviso 15 min antes, lembrete avulso, refeição do plano com aviso, tudo com o celular offline.

## Investimentos (25/11/2026)

- [ ] Criar conta grátis na brapi (https://brapi.dev) e gerar o token.
- [ ] Criar conta grátis na CoinGecko e gerar a chave **Demo**.
- [ ] Guardar as chaves no Supabase (projeto GLIFE), na raiz `glife/`:
      `pnpm sb secrets set BRAPI_TOKEN=sua_chave COINGECKO_DEMO_KEY=sua_chave`
      (sem elas, a brapi só cota PETR4, VALE3, MGLU3 e ITUB4, e a CoinGecko fica bem limitada).
- [ ] Testar Investimentos no Chrome e no APK: claro/escuro, 360 dp, nomes longos, ação (ITSA4), FII (HGLG11),
      cripto (bitcoin), "Já tenho", aporte com conta (saldo e extrato), encerrar, excluir e desfazer.

## Compras (25/11/2026)

- [ ] Testar Compras no Chrome e no APK (claro/escuro, 360 dp).
- [ ] Confirmar: "pago por outra pessoa" deve contar como **receita**?

## Já publicado (não precisa fazer)

Migrações até `20261126000001` (agenda e dieta, publicada em 25/11/2026 sem backup: o Docker não subiu), sync-streams v7 no PowerSync e a Edge Function `quotes`.
