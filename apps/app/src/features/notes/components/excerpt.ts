/** Texto corrido para a prévia da lista: sem marcação de markdown, numa linha, cortado com reticências. */
export function noteExcerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1') // [[Nota]] ou [[Nota|apelido]]
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [texto](url) e imagens
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // títulos, citações, listas
    .replace(/(\*\*|__|\*|_|~~|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
