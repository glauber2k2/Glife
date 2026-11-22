-- notes: notas, devocionais e diário (markdown).
create table public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  parent_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.note_folders');
-- FKs compostas (id, user_id): só dá para apontar para pastas do mesmo dono.
-- `set null (coluna)` zera só a referência, nunca o user_id.
alter table public.note_folders
  add foreign key (parent_id, user_id) references public.note_folders (id, user_id) on delete set null (parent_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default '',
  body_md text not null default '',
  folder_id uuid,
  pinned boolean not null default false,
  kind text not null default 'note' check (kind in ('note', 'devotional', 'journal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (folder_id, user_id) references public.note_folders (id, user_id) on delete set null (folder_id)
);
create index on public.notes (user_id, lower(title));
select public.vida_apply_standard('public.notes');

alter publication powersync add table public.note_folders, public.notes;
