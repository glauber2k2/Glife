// Tags na busca universal: poucas, filtradas em memória. Abrem a lista de Notas filtrada pela tag.
import { matchesWords, type SearchSource } from '@glife/domain/search';
import type { TagsRepository } from '@glife/domain/tags';

export function createTagsSearchSource(tags: TagsRepository): SearchSource {
  return {
    group: 'tags',
    async search(query, limit) {
      return (await tags.list())
        .filter((t) => matchesWords(t.name, query.replace(/^#+/, '')))
        .slice(0, limit)
        .map((t) => ({ group: 'tags', id: t.id, title: `#${t.name}`, href: `/notas?tag=${t.id}` }));
    },
  };
}
