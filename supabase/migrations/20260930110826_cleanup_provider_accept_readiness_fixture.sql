-- UGO TEST fixture cleanup: provider-accept readiness left one demo assignment active.
-- Close only the exact synthetic fixture so later provider readiness probes are deterministic.
update public.servicios
set estado='cancelado',
    updated_at=now(),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'readiness_fixture_cleaned',true,
      'readiness_fixture_cleaned_at',now(),
      'readiness_fixture_source','provider-accept'
    )
where id='f0292929-0000-4000-8000-000000000001'
  and ambiente='demo'
  and descripcion='READINESS provider-accept concurrency'
  and estado='asignado';
