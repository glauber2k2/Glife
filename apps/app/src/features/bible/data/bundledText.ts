// Traduções embutidas no app: cada livro é um asset `.bible` (JSON) que o Metro empacota fora do bundle JS.
/** Gerado por tools/bible-import; `books[código]` é o módulo de asset do livro (número devolvido pelo `require`). */
export interface BundledTranslation {
  id: string;
  abbr: string;
  name: string;
  credit: string;
  books: Record<string, number>;
}
