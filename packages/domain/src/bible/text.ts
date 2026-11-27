// Fontes do texto bíblico (só leitura): traduções embutidas no app e as importadas pelo usuário, que ficam só no
// aparelho. O leitor pede um capítulo por vez; quem implementa cuida de cache e plataforma.

export interface Translation {
  id: string;
  /** sigla mostrada no seletor, ex.: "BLIVRE" */
  abbr: string;
  name: string;
  /** crédito exigido pela licença (null nas importadas) */
  credit: string | null;
  source: 'bundled' | 'imported';
}

export interface BibleTextSource {
  translations(): Promise<Translation[]>;
  /** Versículos do capítulo (índice 0 = versículo 1); null se a tradução não tem esse capítulo. */
  chapter(translationId: string, book: string, chapter: number): Promise<string[] | null>;
}

export function combineSources(...sources: BibleTextSource[]): BibleTextSource {
  const owner = new Map<string, BibleTextSource>();
  return {
    async translations() {
      const lists = await Promise.all(sources.map((s) => s.translations().catch(() => [] as Translation[])));
      owner.clear();
      const out: Translation[] = [];
      lists.forEach((list, i) =>
        list.forEach((t) => {
          if (owner.has(t.id)) return;
          owner.set(t.id, sources[i]!);
          out.push(t);
        }),
      );
      return out;
    },
    async chapter(id, book, chapter) {
      if (!owner.has(id)) await this.translations();
      return (await owner.get(id)?.chapter(id, book, chapter)) ?? null;
    },
  };
}
