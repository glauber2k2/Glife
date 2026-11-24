-- finance: contas (cartão com fatura), categorias, recorrências, transações e orçamentos.
-- Dinheiro sempre em centavos (bigint, > 0; o sentido vem do `type`). Datas de calendário em `date`, meses em texto YYYY-MM.
-- Os `check` repetem as regras do domain (packages/domain/src/finance/model.ts); coerência entre tipo e categoria
-- fica no domain (precisa olhar outra tabela).

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('checking', 'savings', 'cash', 'credit_card')),
  initial_balance_cents bigint not null default 0,
  archived boolean not null default false,
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  credit_limit_cents bigint check (credit_limit_cents >= 0),
  payment_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    case when kind = 'credit_card'
      then closing_day is not null and due_day is not null and initial_balance_cents = 0
      else closing_day is null and due_day is null and credit_limit_cents is null and payment_account_id is null
    end
  )
);
select public.vida_apply_standard('public.accounts');
-- Conta que paga a fatura (só cartão). Obrigatória no domain; aqui pode ficar nula se a pagadora for apagada de vez.
alter table public.accounts
  add foreign key (payment_account_id, user_id) references public.accounts (id, user_id) on delete set null (payment_account_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('expense', 'income')),
  color text not null check (color in ('slate', 'steel', 'sage', 'sand', 'clay', 'rose', 'plum', 'teal')),
  icon text not null check (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(icon) <= 60),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.categories');

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  description text not null default '' check (char_length(description) <= 200),
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  interval_count smallint not null default 1 check (interval_count between 1 and 99),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date is null or end_date >= start_date),
  check (
    case when type = 'transfer'
      then to_account_id is not null and to_account_id <> account_id and category_id is null
      else to_account_id is null
    end
  ),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (to_account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);
select public.vida_apply_standard('public.recurrences');

-- installment_of e recurrence_id são referências leves (sem FK): apagar a 1ª parcela ou a regra de vez
-- não pode quebrar o `check` de "campos juntos" das outras linhas.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  status text not null default 'confirmed' check (status in ('planned', 'confirmed', 'skipped')),
  amount_cents bigint not null check (amount_cents > 0),
  date date not null,
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  description text not null default '' check (char_length(description) <= 200),
  invoice_month text check (invoice_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  installment_of uuid,
  installment_index smallint,
  installment_count smallint,
  recurrence_id uuid,
  occurrence_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    case when type = 'transfer'
      then to_account_id is not null and to_account_id <> account_id and category_id is null
      else to_account_id is null
    end
  ),
  check (
    (installment_of is null and installment_index is null and installment_count is null)
    or (installment_of is not null and installment_index between 1 and installment_count and installment_count <= 120)
  ),
  check ((recurrence_id is null) = (occurrence_date is null)),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (to_account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);
select public.vida_apply_standard('public.transactions');
create index on public.transactions (user_id, date);
create index on public.transactions (user_id, account_id, invoice_month);
create unique index transactions_occurrence_unique on public.transactions (user_id, recurrence_id, occurrence_date)
  where recurrence_id is not null and deleted_at is null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null,
  starts_month text not null check (starts_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);
select public.vida_apply_standard('public.budgets');
create unique index budgets_category_month_unique on public.budgets (user_id, category_id, starts_month)
  where deleted_at is null;

alter publication powersync add table public.accounts, public.categories, public.recurrences, public.transactions, public.budgets;
