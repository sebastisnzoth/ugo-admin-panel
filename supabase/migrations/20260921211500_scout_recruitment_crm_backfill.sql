-- Backfill CRM state for Scout rows that existed before the recruitment funnel.
update public.prospectos_scouts
set ultimo_contacto_at=coalesce(ultimo_contacto_at,contactado_at),
    contactos_intentos=case when contactado_at is not null and contactos_intentos=0 then 1 else contactos_intentos end,
    ultimo_canal=case when contactado_at is not null and ultimo_canal is null then 'historico' else ultimo_canal end
where contactado_at is not null;

update public.prospectos_scouts
set pipeline_etapa='listo'
where pipeline_etapa='nuevo'
  and no_contactar=false
  and coalesce(btrim(telefono),'')<>''
  and recruitment_score>=50;

notify pgrst,'reload schema';
