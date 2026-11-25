-- finance: listas de compras e itens. O "Comprei" vira um gasto (transactions) gravado junto, no domain.
-- Preço em centavos por unidade (opcional: item sem preço deixa o total aproximado).

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category_id uuid,
  last_purchase_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);
select public.vida_apply_standard('public.shopping_lists');

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 999),
  unit_price_cents bigint check (unit_price_cents > 0),
  in_cart boolean not null default false,
  always boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (list_id, user_id) references public.shopping_lists (id, user_id) on delete cascade
);
select public.vida_apply_standard('public.shopping_items');
create index on public.shopping_items (user_id, list_id);

alter publication powersync add table public.shopping_lists, public.shopping_items;
