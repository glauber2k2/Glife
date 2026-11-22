-- notes: notas, devocionais e diário (markdown).
create table public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  parent_id uuid references public.note_folders on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.vida_apply_standard('public.note_folders');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default '',
  body_md text not null default '',
  folder_id uuid references public.note_folders on delete set null,
  pinned boolean not null default false,
  kind text not null default 'note' check (kind in ('note', 'devotional', 'journal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.notes (user_id, lower(title));
select public.vida_apply_standard('public.notes');

alter publication powersync add table public.note_folders, public.notes;
