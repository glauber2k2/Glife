# Pendências do usuário

O que só o dono do projeto pode fazer (contas, chaves, testes no aparelho, decisões). Ao concluir um item, apague-o.

## Fechamento da Fase R2 (26/11/2026)

- [ ] Republicar `supabase/powersync/sync-streams.yaml` no PowerSync: Glife → Production → Sync Streams → colar o arquivo → Validate → Deploy. Inclui a tabela `diet_goals`; as duas migrações R2 já foram aplicadas no Supabase.
- [ ] Instalar o APK 0.5.0 e conferir no Android e no Chrome: dois temas, largura de 360 dp e textos longos.
- [ ] Testar uma alteração offline entre Android e web, a preferência do olhinho após reabrir e os botões Feito, Registrar e Adiar com o app aberto e com o app fechado (incluindo concluir um item adiado).

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

Migrações até `20261127000002` (R2 publicada em 26/11/2026 após backup em `../backups/glife-r2-20261126/`); verificação de RLS hospedado sem problemas. A Edge Function `quotes` e os Sync Streams v7 já estavam publicados; a versão atual do arquivo de Sync Streams ainda precisa ser republicada.
