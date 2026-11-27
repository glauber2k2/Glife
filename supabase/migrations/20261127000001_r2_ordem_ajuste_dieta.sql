-- Fase R2: ordem de contas e categorias, ajuste de saldo e calorias/macros da dieta (migração aditiva).
-- Uma instrução `alter table` por coluna (o teste do schema local lê uma coluna por instrução).

alter table public.accounts add column sort_order integer not null default 0;
alter table public.categories add column sort_order integer not null default 0;

-- Ajuste de saldo: receita/despesa sem categoria, fora de orçamento e gráficos (a regra fica no app).
alter table public.transactions add column is_adjustment boolean not null default false;
alter table public.transactions add constraint transactions_adjustment_check
  check (not is_adjustment or (type in ('income', 'expense') and category_id is null));

-- Dieta: calorias e macros opcionais no plano e no registro da refeição.
alter table public.meal_plans add column kcal integer check (kcal between 0 and 20000);
alter table public.meal_plans add column protein_g numeric(6, 1) check (protein_g between 0 and 2000);
alter table public.meal_plans add column carbs_g numeric(6, 1) check (carbs_g between 0 and 2000);
alter table public.meal_plans add column fat_g numeric(6, 1) check (fat_g between 0 and 2000);

alter table public.meals add column kcal integer check (kcal between 0 and 20000);
alter table public.meals add column protein_g numeric(6, 1) check (protein_g between 0 and 2000);
alter table public.meals add column carbs_g numeric(6, 1) check (carbs_g between 0 and 2000);
alter table public.meals add column fat_g numeric(6, 1) check (fat_g between 0 and 2000);

-- Metas diárias (1 linha por usuário).
create table public.diet_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kcal_target integer check (kcal_target between 0 and 20000),
  protein_g_target numeric(6, 1) check (protein_g_target between 0 and 2000),
  carbs_g_target numeric(6, 1) check (carbs_g_target between 0 and 2000),
  fat_g_target numeric(6, 1) check (fat_g_target between 0 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.diet_goals');
create unique index diet_goals_user_unique on public.diet_goals (user_id) where deleted_at is null;

alter publication powersync add table public.diet_goals;
