# Prototipagem pendente — telas de acesso (T8)

As três telas abaixo existem em versão básica (`apps/app/src/features/auth/screens`). Cole o prompt
no Claude Design, anexando `Glife — Design System.html`, e traga o resultado para a revisão.

---

## Prompt para o Claude Design

```
Projete as telas de acesso do Glife, um app pessoal de organização de vida (notas, finanças, Bíblia,
agenda) para Android e web, com um único usuário. Use o design system anexo (Glife — Design System.html)
e siga-o à risca.

Princípios do Glife:
- Sofisticado e minimalista: uma única cor de destaque (azul #3451B2 no claro, #8DA4EF no escuro),
  sem sombras e sem gradientes; separação por espaço e linhas finas (hairlines).
- Tipografia: Inter para a interface; Source Serif 4 só onde houver leitura longa.
- Grade de 4 px; cantos de 8 px em campos/botões e 12 px em cartões; alvo de toque mínimo de 44 px.
- Modo claro e modo escuro de primeira classe: entregue as duas versões de cada tela.
- Movimento sóbrio: molas amortecidas de 200–350 ms, sem quique; descreva as transições entre etapas.
- Textos em português do Brasil, tom calmo e direto. Nada de marketing.
- Mobile primeiro (390×844); no web, coluna central de no máximo 400 px.

Fluxo (o banco só aceita sessão com verificação em duas etapas, então ela é obrigatória):

1. ENTRAR — e-mail e senha. Não há cadastro público nem "criar conta". Mostre os estados: vazio,
   preenchido, carregando (botão com indicador), erro "E-mail ou senha incorretos.", sem internet
   ("Sem conexão com o servidor. Verifique a internet.") e muitas tentativas.

2. PROTEJA SUA CONTA (só no primeiro acesso) — explica em uma frase que o Glife exige verificação em
   duas etapas; mostra um QR code para ler com um app autenticador (Google Authenticator, Microsoft
   Authenticator, 1Password), a chave em texto para digitar manualmente (com ação de copiar), o campo do
   código de 6 dígitos e o botão "Ativar verificação". O QR fica sempre sobre fundo claro, mesmo no
   tema escuro. Estados: preparando o QR, código inválido, falha ao gerar com "Tentar de novo".
   Inclua uma saída discreta "Sair".

3. VERIFICAÇÃO (acessos seguintes) — "Digite o código do seu app autenticador", campo de 6 dígitos
   (pense em 6 casas separadas ou num campo único bem espaçado; escolha e justifique), botão
   "Confirmar", texto de erro para código inválido/expirado lembrando de conferir o relógio do celular,
   e "Sair". Mostre também o e-mail da conta, discreto.

Também quero:
- Como a marca "Glife" aparece nessas telas (só wordmark tipográfico, sem ilustrações).
- A seção "Conta" da tela Ajustes: "Conectado como <e-mail>" e o botão "Sair deste aparelho".
- Especificação para implementação: espaçamentos, tamanhos de texto e cores referindo os tokens do
  design system (não valores soltos), e a animação de troca entre as etapas 1 → 2/3 → app.
```
