-- links: o grafo que liga qualquer entidade a qualquer outra.
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_ref text not null,              -- uuid ou referência OSIS ('JHN.3.16-18')
  relation text not null default 'ref' check (relation in ('ref', 'embed', 'receipt', 'about')),
  origin text not null default 'manual' check (origin in ('manual', 'markdown', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.links (target_type, target_ref);   -- backlinks
create index on public.links (source_type, source_id);
select public.vida_apply_standard('public.links');

-- tags aplicáveis a qualquer entidade
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index on public.tags (user_id, lower(name)) where deleted_at is null;
select public.vida_apply_standard('public.tags');

create table public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tag_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- FK composta: a tag precisa ser do mesmo dono.
  foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade
);
create index on public.entity_tags (entity_type, entity_id);
select public.vida_apply_standard('public.entity_tags');

alter publication powersync add table public.links, public.tags, public.entity_tags;
