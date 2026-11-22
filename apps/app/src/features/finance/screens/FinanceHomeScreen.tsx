import { EmptyState, Screen } from '@/shared/ui';

export function FinanceHomeScreen() {
  return (
    <Screen title="Finanças">
      <EmptyState message="Nenhuma conta cadastrada." actionLabel="Adicionar conta" onAction={() => {}} />
    </Screen>
  );
}
