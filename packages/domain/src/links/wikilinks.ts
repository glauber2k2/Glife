// Parser dos links dentro do markdown:
//   [[Reunião com pastor]]          → nota pelo título
//   [[tx:41aa…|Mercado 22/11]]      → qualquer entidade, com texto exibido
//   [[Jo 3:16]]                     → referência bíblica
//   ![[media:e5f6…]]                → imagem embutida
// Links dentro de blocos de código (``` ou `inline`) são ignorados.
import { parseBibleRef, toOsis } from '../bible/index.ts';
import { isEntityType, isValidRef, type EntityAddress } from './uri.ts';

export type LinkRelation = 'ref' | 'embed' | 'receipt' | 'about';
export type LinkOrigin = 'manual' | 'markdown' | 'ai';

export type WikilinkTarget = EntityAddress | { type: 'note_title'; title: string };

export interface Wikilink {
  raw: string;
  target: WikilinkTarget;
  label?: string;
  relation: Extract<LinkRelation, 'ref' | 'embed'>;
  /**
   * Presente quando o alvo foi deduzido de texto sem prefixo (ex.: `[[Ap 12]]` → Apocalipse 12).
   * Se existir uma nota com exatamente esse título, ela tem prioridade (ver desiredLinks).
   */
  titleFallback?: string;
  start: number;
  end: number;
}

const WIKILINK_RE = /(!?)\[\[([^[\]\n]+?)\]\]/g;

/** Substitui código (cercado e inline) por espaços, mantendo as posições do texto. */
function maskCode(md: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  return md
    .replace(/```[\s\S]*?(```|$)/g, blank)
    .replace(/``[^\n]*?``/g, blank)
    .replace(/`[^`\n]*`/g, blank);
}

export function parseTarget(inner: string): WikilinkTarget | null {
  const text = inner.trim();
  if (!text) return null;

  const typed = text.match(/^([a-z_]+):(.+)$/);
  if (typed && isEntityType(typed[1]!)) {
    const type = typed[1]!;
    const ref = typed[2]!.trim();
    if (type === 'bible') {
      // aceita tanto OSIS ("bible:JHN.3.16") quanto digitação ("bible:Jo 3:16")
      const parsed = isValidRef('bible', ref) ? ref : (() => {
        const r = parseBibleRef(ref);
        return r ? toOsis(r) : null;
      })();
      if (parsed) return { type: 'bible', ref: parsed };
    } else if (isValidRef(type, ref)) {
      return { type, ref: ref.toLowerCase() };
    }
    // Prefixo conhecido com referência inválida ("[[note: reunião]]"): vale como título, não some.
  }

  const bible = parseBibleRef(text);
  if (bible) return { type: 'bible', ref: toOsis(bible) };

  // [[Título#Seção]] → só o título identifica a nota
  const title = text.split('#')[0]!.trim();
  return title ? { type: 'note_title', title } : null;
}

export function parseWikilinks(markdown: string): Wikilink[] {
  const masked = maskCode(markdown);
  const out: Wikilink[] = [];
  for (const m of masked.matchAll(WIKILINK_RE)) {
    const [raw, bang, inner] = m;
    const pipe = inner!.indexOf('|');
    const targetText = pipe >= 0 ? inner!.slice(0, pipe) : inner!;
    const label = pipe >= 0 ? inner!.slice(pipe + 1).trim() : undefined;
    const target = parseTarget(targetText);
    if (!target) continue;
    const start = m.index!;
    const bare = targetText.trim();
    const inferred = target.type !== 'note_title' && !bare.startsWith(`${target.type}:`);
    out.push({
      raw,
      target,
      ...(label ? { label } : {}),
      ...(inferred ? { titleFallback: bare } : {}),
      relation: bang ? 'embed' : 'ref',
      start,
      end: start + raw.length,
    });
  }
  return out;
}

/** Gera o texto de um link para inserir no markdown (usado pelo autocomplete `[[`). */
export function formatWikilink(target: WikilinkTarget, opts: { label?: string; embed?: boolean } = {}): string {
  const inner = target.type === 'note_title' ? target.title : `${target.type}:${target.ref}`;
  const label = opts.label ? `|${opts.label}` : '';
  return `${opts.embed ? '!' : ''}[[${inner}${label}]]`;
}
