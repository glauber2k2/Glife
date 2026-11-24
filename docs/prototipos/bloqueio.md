# Bloqueio do app (Fase 1) — prototipado

Protótipo no Claude Design: `Glife Bloqueio.dc.html` (telas em `BloqueioTela.dc.html`). Implementado em
`apps/app/src/features/app-lock` (T26, 24/11/2026). Revisão de 24/11/2026 contra o protótipo atualizado: bloqueio,
criar/trocar a senha, oferta da biometria e Ajustes › Segurança já batiam (textos, espaços, ícones e estados); só o
`BackHeader` mudou de lugar (`shared/ui`). A seção "Privacidade › Esconder conteúdo nos apps recentes" do protótipo
fica de fora por decisão do usuário (ver AGENTS.md, "Decisões tomadas"). Regras completas em `../Glife — Planejamento do Projeto.md`, seção
"Bloqueio do app: biometria, e senha se falhar". Cole o prompt no Claude Design (projeto do Glife, com o design
system `Glife Design System` anexado) e traga o resultado.

## Prompt para o Claude Design

```
Projete o bloqueio do Glife (app pessoal de organização de vida, pt-BR, Android e web, um único usuário).
Use o design system anexo (Glife — direção Glaciar + Sinóptico) e siga-o à risca: Hanken Grotesk na interface
(títulos grandes e leves), neutros azulados com um único destaque azul-aço, sem sombras nem gradientes, sem caixas
para agrupar (blocos separados por 18 px + linha de 1 px), controles em pílula, campos com raio 16, margem lateral
22, ícones Lucide contorno 1,5, sem emoji. Claro e escuro de cada estado. Mobile 390×844; web em coluna estreita
(como as telas de acesso já prototipadas em "Glife Acesso"), sem biometria no web.

Regras que as telas precisam mostrar:
- O app nunca abre sem desbloqueio: ao abrir e ao voltar depois de 1 min em segundo plano (ajustável).
- A biometria do celular é o caminho normal e é chamada sozinha ao aparecer a tela. Se falhar, for cancelada ou
  não existir, aparece a senha do app (nunca o PIN do celular). No web, só a senha do app.
- A senha do app é própria do Glife (mínimo 6 caracteres), diferente da senha da conta e do PIN do celular.
- Erros seguidos: depois de 5, espera de 30 s; depois de 7, espera de 5 min; depois de 10, o app trava e só libera
  com o login completo da conta (e-mail, senha e código do autenticador), que permite criar uma senha nova.
- Uma digital nova cadastrada no celular faz o app pedir a senha uma vez antes de voltar a aceitar a biometria.

Telas e estados:
1. Tela de bloqueio — (a) chamando a biometria (aguardando o sistema); (b) biometria cancelada/falhou: campo da
   senha com "Usar biometria" para tentar de novo; (c) senha errada, com a contagem discreta ("3 de 5 tentativas
   antes de esperar"); (d) esperando 30 s / 5 min com contagem regressiva e o campo desabilitado; (e) travado após
   10 erros: explicação curta e botão "Entrar com a conta"; (f) "Digital nova no celular: confirme com a senha".
   O conteúdo do app nunca aparece por trás (nada de desfoque mostrando dados).
2. Criar a senha do app (primeiro uso, logo depois do primeiro login): senha + confirmação, regra dos 6 caracteres,
   frase curta explicando que é só deste aparelho e que esquecê-la exige entrar com a conta; depois, oferta de
   ligar a biometria.
3. Trocar a senha (em Ajustes): senha atual, nova, confirmação.
4. Ajustes › Segurança: bloqueio (sempre ligado, explicado), usar biometria (liga/desliga), "Bloquear depois de"
   (imediatamente, 1 min, 5 min, 15 min), trocar a senha do app.

Movimento (sóbrio, molas tap/std/emph/gentle, respeitando "reduzir movimento"): a tela de bloqueio entra sem
animar o conteúdo por trás; senha errada faz o campo tremer de leve uma vez (curto, sem quique exagerado) ou outra
alternativa sóbria que você propuser; desbloquear revela o app com fade; a contagem regressiva conta sem pular.
Descreva cada animação junto da tela.
```
