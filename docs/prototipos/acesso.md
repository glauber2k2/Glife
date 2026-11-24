# Telas de acesso (T8) — prototipadas

Protótipo no Claude Design: projeto `e085c8e7-a0f8-47b5-96f2-ec2d4d51caa0`, arquivo `Glife Acesso.dc.html`
(telas em `AcessoTela.dc.html`). Implementado em `apps/app/src/features/auth` (T9, 23/11/2026).

Decisões trazidas do protótipo:
- Marca só tipográfica: "Glife" 44/300 na tela Entrar; 20/300 no cabeçalho das etapas seguintes, ao lado de "Sair".
- Mensagens sempre entre os campos e o botão, com ícone de 16 px: erro de digitação em `danger`, falta de internet
  em tom secundário (não é culpa do usuário), muitas tentativas em `warning` com o botão bloqueado por 60 s.
- Código: 6 casas visuais em dois grupos de 3 sobre um único `TextInput` transparente (colar, preenchimento
  automático e leitor de tela funcionam como num campo comum). Envia sozinho no 6º dígito; depois de erro, digitar
  recomeça e apagar limpa.
- QR sempre em papel claro (`qrPaper`/`qrInk` iguais nos dois temas); chave em mono, grupos de 4, com "Copiar"
  que vira "Copiada" por 2,2 s.
- "Sair deste aparelho" em Ajustes é secundário, sem cor de alerta, abaixo de Aparência.
- Ajustes (revisão de 24/11/2026, protótipo atualizado): "Voltar" de 44 px + título 34/300 (`BackHeader`, agora em
  `shared/ui`), 32 px até a primeira seção; Aparência é a linha "Tema" com `SegmentedControl` Claro · Escuro · Sistema
  (pílula de 32 px, casas iguais, indicador `soft` deslizando na mola standard, rótulos 12,5/600).
- Conferido na web (390 × 808, claro e escuro) contra páginas avulsas de cada estado do protótipo: Entrar igual.
  O canvas desenha 16 px entre a senha e "Entrar" e o "Sair deste aparelho" em largura total porque o
  `style` do `x-import` não chega ao componente; vale a tabela de especificação (32 px; botão à esquerda).

Pendente do protótipo: transição compartilhada do wordmark (44 → 20 px).
