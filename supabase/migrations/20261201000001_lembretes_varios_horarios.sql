-- Lembrete mais de uma vez no dia: numa lista de horários (`times`) ou de tanto em tanto tempo (`time` até
-- `end_time`, a cada `every_minutes`). Cada horário se conclui sozinho (`done_slots`). Listas em texto JSON, como
-- `skipped_dates` (o app as envia assim). Lembretes antigos ficam em 'once' e não mudam.

alter table public.reminders add column time_mode text not null default 'once' check (time_mode in ('once', 'list', 'interval'));
alter table public.reminders add column times text not null default '[]' check (char_length(times) <= 400);
alter table public.reminders add column every_minutes integer check (every_minutes between 15 and 720);
alter table public.reminders add column end_time text check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.reminders add column done_slots text not null default '[]' check (char_length(done_slots) <= 8000);

alter table public.reminders
  add constraint reminders_time_mode_fields check (
    case time_mode
      when 'once' then times = '[]' and every_minutes is null and end_time is null
      when 'list' then every_minutes is null and end_time is null and jsonb_typeof(times::jsonb) = 'array'
        and jsonb_array_length(times::jsonb) between 2 and 24
      else times = '[]' and every_minutes is not null and end_time is not null and end_time > time
    end
  ),
  add constraint reminders_multi_not_done check (time_mode = 'once' or done_at is null),
  add constraint reminders_done_slots_array check (jsonb_typeof(done_slots::jsonb) = 'array');
