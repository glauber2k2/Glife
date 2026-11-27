-- Nota é só nota (decisão do usuário, 27/11/2026): sem tipos "devocional" e "diário". Quem quiser marca com uma tag
-- (#devocional, #diário). As notas que já tinham tipo ganham a tag equivalente antes de a coluna sair, para nada se
-- perder; tag de mesmo nome (sem diferenciar maiúsculas) é reaproveitada. Rodar só depois que o app sem `kind`
-- estiver instalado: o app antigo envia a coluna e o envio seria recusado.

insert into public.tags (user_id, name)
select distinct n.user_id, t.name
from public.notes as n
cross join lateral (select case n.kind when 'devotional' then 'devocional' else 'diário' end as name) as t
where n.kind in ('devotional', 'journal')
  and not exists (
    select 1 from public.tags as x
    where x.user_id = n.user_id and lower(x.name) = t.name and x.deleted_at is null
  );

insert into public.entity_tags (user_id, tag_id, entity_type, entity_id)
select n.user_id, x.id, 'note', n.id
from public.notes as n
cross join lateral (select case n.kind when 'devotional' then 'devocional' else 'diário' end as name) as t
join public.tags as x on x.user_id = n.user_id and lower(x.name) = t.name and x.deleted_at is null
where n.kind in ('devotional', 'journal')
  and not exists (
    select 1 from public.entity_tags as e
    where e.user_id = n.user_id and e.tag_id = x.id and e.entity_type = 'note' and e.entity_id = n.id
      and e.deleted_at is null
  );

alter table public.notes drop column kind;
