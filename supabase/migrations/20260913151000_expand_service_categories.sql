-- UGO TEST · expand the client-visible service catalog with categories already understood by Hugo.
-- IDs use the table default; slugs are the stable business identifiers.

insert into public.categorias(slug,nombre,emoji,activa)
select item.slug,item.nombre,item.emoji,true
from (values
  ('jardineria','Jardinería','🌿'),
  ('pintura','Pintura','🎨'),
  ('cerrajeria','Cerrajería','🔐')
) as item(slug,nombre,emoji)
where not exists(
  select 1 from public.categorias existing where existing.slug=item.slug
);

update public.categorias
set activa=true
where slug in ('jardineria','pintura','cerrajeria');
