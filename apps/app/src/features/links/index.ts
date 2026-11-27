export { linksTableLabels, linksTables } from './data/schema';
export { LinksProvider, useLinksData, useLinksDataMaybe, useLinksSearchSources } from './hooks/LinksData';
export { TaggedItemsProvider, liveTagCounts, useTaggedItemSources, useTaggedItemsVersion, type TaggedItemUiSource } from './hooks/TaggedItems';
export {
  TargetsProvider,
  useAddressHref,
  useHasTargetSource,
  useOpenAddress,
  useOpenRoute,
  useOpenTarget,
  useResolveTarget,
  useTargetSources,
  type AddressRoute,
} from './hooks/Targets';
export { notFoundHref, type TargetSource, type TargetStatus } from './data/targets';
export { NotFoundScreen } from './screens/NotFoundScreen';
export { LinkedNotesField } from './components/LinkedNotesField';
export { NoteLinkerProvider, useLinkedNotes, useNoteLinker, type LinkedNote, type LinkedNotes, type NoteChoice, type NoteLinkerPort } from './hooks/NoteLinker';
