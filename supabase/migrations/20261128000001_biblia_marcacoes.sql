-- Bíblia: marcações do usuário (marca-texto numa cor ou sublinhado) sobre o texto, que é só leitura e fica no app.
-- A marcação é presa à referência OSIS de um versículo (`JHN.3.16`), não à tradução.
-- Sem unique em (user_id, ref): dois aparelhos offline podem marcar o mesmo versículo; o app lê a mais recente e
-- apaga as cópias na gravação seguinte (um unique faria o envio de um dos aparelhos ser recusado).
-- char_start/char_end ficam reservados para o grifo de parte do versículo (nulos = versículo inteiro).

create table public.bible_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ref text not null check (ref ~ '^[1-3]?[A-Z]{2,3}\.[0-9]{1,3}\.[0-9]{1,3}$'),
  color text not null check (color in ('yellow', 'green', 'blue', 'pink')),
  style text not null default 'highlight' check (style in ('highlight', 'underline')),
  char_start integer check (char_start >= 0),
  char_end integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((char_start is null) = (char_end is null)),
  check (char_end is null or char_end >= char_start)
);
select public.vida_apply_standard('public.bible_highlights');
create index on public.bible_highlights (user_id, ref);

alter publication powersync add table public.bible_highlights;
