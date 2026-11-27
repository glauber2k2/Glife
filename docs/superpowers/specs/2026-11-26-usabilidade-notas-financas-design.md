# Ajustes de usabilidade de Notas e Finanças

Data: 2026-11-26. Estado: aprovado pelo usuário ("aprovar").

## Pedido e resultado esperado

Implementar as cinco mudanças solicitadas pelo usuário, seguindo o Cobalto e a arquitetura existente:

1. Olhinho no resumo/atalho financeiro da Home, com a mesma preferência persistida do Financeiro.
2. Corrigir o espaço indevido e o crash ao editar/tocar nas linhas vazias depois de uma lista Markdown.
3. Permitir pastas de notas dentro de outras pastas.
4. Escolher entre informar o valor total de uma compra parcelada e informar o valor de cada parcela.
5. Abrir os seletores nativos nos campos de data e hora.

## Abordagem escolhida para a proposta

Aproveitar os componentes, portas de repositório e regras já presentes. A escolha de implementação fica com o agente, conforme o pedido de manter os padrões do sistema.

- A visibilidade monetária já é compartilhada por `MoneyVisibilityProvider`; o botão da Home usará o mesmo componente `MoneyEyeButton`.
- `note_folders.parent_id`, `NoteFoldersRepository.move` e a validação de ciclos já existem no banco e nos dois repositórios. A interface passará a expor essa capacidade.
- Parcelamento continua usando centavos inteiros e a gravação em lote existente. Uma função pura resolve o total e a distribuição a partir do modo de entrada.
- Datas e horas continuam nos formatos usados hoje pelos formulários. Os campos compartilhados encapsulam as diferenças entre Android, iOS e web.
- O diagnóstico do Markdown antecede a correção. O editor continua preservando integralmente o conteúdo e a formatação já suportada.

Duplicar preferências, representar a hierarquia no nome das pastas ou distribuir regras financeiras nas telas não atende à arquitetura do projeto. Não há necessidade prevista de migração de banco.

## Comportamento e interface

### Home e visibilidade financeira

O cartão financeiro da Home recebe o olhinho junto ao título/atalho. O botão alterna a visibilidade em todas as telas que já usam a preferência, e a escolha continua salva no aparelho. Tocar no botão não abre o Financeiro. O restante do cartão mantém a navegação atual.

### Markdown

Investigar a montagem do texto nativo, os trechos de linhas vazias e os eventos de seleção. O caso de regressão contém lista, duas quebras de linha, espaços e novo parágrafo; também cobre apagar texto, voltar o cursor e aplicar formatação nessas posições.

O texto salvo deve ser exatamente o texto digitado, incluindo espaços e quebras de linha. Os índices de seleção devem permanecer dentro do texto após edições. A correção deve preservar a formatação ao vivo e os modos Ler/Escrever. A origem exata do crash ainda está em investigação; não se assume uma causa só pelo relato.

### Subpastas

- Pastas mostra as pastas da raiz; abrir uma pasta mostra suas subpastas e suas notas diretas.
- Dentro da pasta haverá a ação Nova subpasta e indicação do caminho/volta para a pasta pai.
- A ação Mover pasta oferece destinos válidos e Raiz; exclui a própria pasta e seus descendentes.
- Mover uma nota, inclusive em lote, permite escolher subpastas e apresenta o caminho para distinguir nomes iguais.
- Criar pasta dentro de outra informa `parent_id` ao repositório atual.
- Exclusão mantém o contrato existente: subpastas sobem para o pai; notas sobem ou vão para a lixeira conforme a opção escolhida. A navegação acompanha a pasta pai.
- A navegação e os seletores devem tolerar dados órfãos ou ciclos recebidos, sem recursão infinita. Contagens devem evitar carregar o conteúdo de todas as notas; o mecanismo de agregação pode ser definido no plano.

### Valor total ou valor da parcela

Em compras parceladas no cartão, o formulário oferece:

```text
Informar valor: [Total da compra] [Cada parcela]
Valor total / Valor da parcela
3 parcelas · total R$ 300,00
```

O padrão é Total da compra. A opção Cada parcela multiplica o valor informado pelo número de parcelas e grava parcelas iguais. No modo Total, a distribuição atual continua preservando cada centavo e destinando o resto às primeiras parcelas.

Decisão proposta: trocar a opção mantém os dígitos informados e atualiza imediatamente o rótulo e a simulação, sem gravar nada. Por exemplo, R$ 100,00 em 3 parcelas representa total R$ 100,00 no primeiro modo e total R$ 300,00 no segundo. A escolha fica explícita junto ao valor.

A opção aparece apenas quando é uma compra nova parcelada no cartão, sem repetição: Novo lançamento e confirmação de compras. Transferências, receitas, compras à vista e recorrências mantêm seus comportamentos. O cadastro de parcelamentos já em andamento continua informando o valor de cada parcela e a parcela atual, como hoje, sem inferir o preço original nem alterar parcelas pagas. Validar limites, quantidade de parcelas e estouro de inteiros antes de gravar.

### Data e hora

- Android usa os diálogos nativos de calendário e relógio, pelo pacote compatível com o Expo SDK instalado.
- iOS usa os controles nativos equivalentes. Web usa os seletores próprios do navegador.
- Confirmar atualiza o campo; cancelar preserva o valor anterior. Campos opcionais continuam podendo ficar vazios.
- No aparelho, tocar no campo abre o seletor em lugar do teclado numérico. A entrada manual oferecida pelo próprio seletor nativo continua disponível; no web, vale a interação nativa do navegador. A ação de limpar um campo opcional fica explícita no campo.
- Datas são datas locais de calendário: não converter por UTC, evitando mudança de dia. Hora é HH:MM em 24 horas.
- Preservar os rótulos, estados de erro, temas e formato exibido dd/mm/aaaa e HH:MM.
- Adaptar também o seletor de data usado por Finanças. Campos que representam somente um dia do mês (fechamento/vencimento) continuam numéricos.

## Responsabilidades e limites

Regras de cálculo e hierarquia ficam em funções puras do domínio; acesso ao banco fica nos repositórios; componentes controlam apresentação e interação. Componentes compartilhados não importam features. Integrações nativas ficam encapsuladas e as rotas permanecem finas.

Não alterar autenticação, permissões, pagamentos ou políticas de sincronização. Preservar a exclusão lógica, as ações em transação e os contratos existentes. Seguir tokens, pt-BR, ícones Lucide e movimento reduzido. As mudanças usam telas e fluxos já existentes.

## Verificação e entrega

- Testes de regressão para o Markdown e os índices de seleção.
- Testes das funções de árvore/caminho/destinos e contratos dos repositórios envolvidos.
- Testes de valor por parcela versus total, restos em centavos, quantidades inválidas e estouro.
- Testes da adaptação de datas/horas, cancelamento e formatos locais.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` e exportação web.
- Nova versão Android com a biblioteca nativa incluída, preservando pacote e assinatura. Rodar os testes antes da compilação nativa para evitar disputa de memória.
- Registrar separadamente qualquer conferência no Android que não puder ser feita por falta de aparelho/emulador.
- Atualizar o status e o changelog ao concluir, sem handoff novo.
