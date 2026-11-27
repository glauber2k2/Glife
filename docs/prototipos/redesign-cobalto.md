# Redesign Cobalto — protótipo de todas as telas

Protótipo navegável em `redesign-cobalto/` (abra `index.html` no Chrome; não precisa de servidor). Feito em
26/11/2026 sobre o design system Glife Cobalto (`docs/design-system-cobalto/`). Barra lateral: índice das telas,
tema (claro/escuro/sistema), aparelho (celular/web), câmera lenta e reduzir movimento. Painel direito: a ficha de
cada tela (rota, estados, regras e movimento), que serve de especificação para implementar.

Dados de exemplo; nada é gravado. Senha do bloqueio no protótipo: `123456`.

## Telas por área (63 telas, 38 folhas)

| Área | Telas | Já existe no app? |
|---|---|---|
| Acesso e bloqueio | Entrar, Código de verificação, Configurar autenticador, Criar senha do app (+ oferta da digital), Tela de bloqueio (6 estados) | Sim → Fase R |
| Início e IA | Início (ex-Hoje), Busca universal, Captura (+), Caixa de entrada, Glife IA, Conversas | Início e busca sim → Fase R; caixa, IA e conversas → Fase 6 |
| Notas | Lista, Ler/Escrever, Nova nota, Pastas, Pasta aberta, Lixeira | Sim → Fase R |
| Notas (novas) | Tags, Tag aberta, Seleção múltipla, Nota trancada | Tags e seleção → Fase R2; nota trancada → Fase 7 |
| Finanças | Início, Novo lançamento, Confirmar previsto, Extrato, Fatura (5 situações), Pagar fatura, Nova conta/cartão (em uso ou do zero), Detalhe do lançamento, Recorrentes, Editar recorrência, Orçamentos, Gráficos, Gráfico da categoria | Sim → Fase R |
| Finanças (novas) | Categorias, Editar categoria, Contas e cartões (arquivar, ajustar saldo) | Fase R2 |
| Compras e investimentos | Listas, Lista + Comprei, Investimentos, Ativo, Novo ativo | Sim → Fase R |
| Agenda e dieta | Agenda, Evento, Lembrete, Dieta, Refeição do plano, Registrar refeição | Sim → Fase R |
| Agenda e dieta (novas) | Calendário do mês, Histórico da dieta | Fase R2 |
| Bíblia | Bíblia, Leitor, Devocional (SOAP), Linha do tempo, Busca na Bíblia, Planos de leitura | Fase 4 |
| Galeria | Galeria (+ seleção), Foto, Álbum, Espaço das fotos | Fase 5 |
| Ajustes e segurança | Ajustes, Segurança, Trocar senha do app | Sim → Fase R |
| Sistema e estados | Abertura e primeira sincronização, Notificações, Avisos do Android, Sincronização e offline, Item não encontrado | Fase R2 (espaço das fotos na Fase 5) |

## Decisões que o protótipo assume (confirmar antes de implementar)

- Abas do design system (Início · Agenda · + · Notas · IA) no lugar de Hoje · Notas · Finanças · Bíblia.
- Tema escuro derivado (o design system só traz o claro).
- Fonte serifada (Literata) só para leitura bíblica e devocional.
- Cartões e sombras nos elementos que flutuam passam a valer (o Glaciar proibia caixas e sombras).
- Dieta com calorias e macros (vem da tela de referência do design system; o modelo atual só tem horários e registro).
