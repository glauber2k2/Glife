export { GLIFE_SCHEME, isEntityType, isValidRef, parseUri, toUri, type EntityAddress } from './uri.ts';
export {
  formatWikilink,
  parseTarget,
  parseWikilinks,
  type LinkOrigin,
  type LinkRelation,
  type Wikilink,
  type WikilinkTarget,
} from './wikilinks.ts';
export {
  desiredLinks,
  diffMarkdownLinks,
  type DesiredLink,
  type LinkDiff,
  type LinkRow,
  type TitleResolver,
} from './sync.ts';
