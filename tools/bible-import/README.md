# Importador da Bíblia

Converte USFM (um livro por arquivo) no texto embutido do app (`apps/app/assets/bible/<id>/*.bible`) e gera
`apps/app/src/features/bible/data/bundled/<id>.ts`. Só traduções de licença livre e completas (66 livros) entram aqui;
traduções com direitos autorais (NVI, ARA, ARC…) **nunca** entram no repositório — o app tem "Importar tradução",
que guarda o texto só no aparelho.

```bash
# na raiz glife/; os zips ficam em tools/bible-import/downloads/ (ignorado pelo git)
curl -L -o tools/bible-import/downloads/porbr2018_usfm.zip https://ebible.org/Scriptures/porbr2018_usfm.zip
node tools/bible-import/import.mjs tools/bible-import/downloads/porbr2018 blivre BLIVRE "Bíblia Livre" "<crédito>"
```

| id | Tradução | Licença | Fonte |
|---|---|---|---|
| `blivre` | Bíblia Livre (2018) | CC BY 4.0 — © Diego Santos, Mario Sérgio e Marco Teles | ebible.org/porbr2018 |
| `bpm` | Bíblia Portuguesa Mundial | Domínio público (rascunho em revisão) | ebible.org/porbrbsl |

O script falha se faltar livro ou se a contagem de capítulos divergir de `packages/domain/src/bible/books.ts`.
