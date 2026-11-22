import { EmptyState, Screen } from '@/shared/ui';

export function NoteListScreen() {
  return (
    <Screen title="Notas">
      <EmptyState message="Nenhuma nota ainda." actionLabel="Nova nota" onAction={() => {}} />
    </Screen>
  );
}
