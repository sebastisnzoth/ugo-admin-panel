-- UGO TEST/pilot · first launch categories. Idempotent catalog migration.
insert into public.categorias(slug,nombre,emoji,activa)
select item.slug,item.nombre,item.emoji,true
from (values
 ('faxina','Faxina','🧹'),
 ('marido-de-aluguel','Marido de Aluguel','🧰')
) as item(slug,nombre,emoji)
where not exists(select 1 from public.categorias c where c.slug=item.slug);

update public.categorias set activa=true
where slug in ('faxina','marido-de-aluguel');
