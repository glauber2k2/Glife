import { wouldCreateFolderCycle, type NoteFolder } from './model.ts';

/** Visão de navegação: órfãos sobem e cada ciclo tem uma raiz estável, sem alterar o dado sincronizado. */
function folderIndex(folders: readonly NoteFolder[]) {
  const live = new Map(folders.filter((f) => f.deleted_at === null).map((f) => [f.id, f]));
  const parents = new Map([...live.values()].map((f) => [f.id, f.parent_id && live.has(f.parent_id) ? f.parent_id : null]));
  const done = new Set<string>();
  for (const id of live.keys()) {
    if (done.has(id)) continue;
    const chain: string[] = [];
    const positions = new Map<string, number>();
    let current: string | null = id;
    while (current !== null && !done.has(current)) {
      const position = positions.get(current);
      if (position !== undefined) {
        const anchor = chain.slice(position).sort()[0]!;
        parents.set(anchor, null);
        break;
      }
      positions.set(current, chain.length);
      chain.push(current);
      current = parents.get(current) ?? null;
    }
    for (const item of chain) done.add(item);
  }
  return { live, parents };
}

type FolderIndex = ReturnType<typeof folderIndex>;
const compare = (a: NoteFolder, b: NoteFolder) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

function breadcrumbs(index: FolderIndex, id: string): NoteFolder[] {
  const result: NoteFolder[] = [];
  for (let current: string | null = id; current !== null; current = index.parents.get(current) ?? null) {
    const folder = index.live.get(current);
    if (!folder) break;
    result.push(folder);
  }
  return result.reverse();
}

export function folderBreadcrumbs(folders: readonly NoteFolder[], id: string): NoteFolder[] {
  return breadcrumbs(folderIndex(folders), id);
}

export function folderPath(folders: readonly NoteFolder[], id: string): string {
  return folderBreadcrumbs(folders, id).map((f) => f.name).join(' / ');
}

export function folderChildren(folders: readonly NoteFolder[], parentId: string | null): NoteFolder[] {
  const index = folderIndex(folders);
  return [...index.live.values()].filter((f) => index.parents.get(f.id) === parentId).sort(compare);
}

export function folderDestinations(folders: readonly NoteFolder[], movingId?: string): { folder: NoteFolder; path: string }[] {
  const index = folderIndex(folders);
  return [...index.live.values()]
    .filter((f) => !movingId || !wouldCreateFolderCycle(movingId, f.id, (id) => index.live.get(id)?.parent_id ?? null))
    .map((folder) => ({ folder, path: breadcrumbs(index, folder.id).map((f) => f.name).join(' / ') }))
    .sort((a, b) => a.path.localeCompare(b.path, 'pt-BR', { sensitivity: 'base' }) || compare(a.folder, b.folder));
}
