-- UGO TEST fixture cleanup: provider-reject readiness left two synthetic client services active.
update public.servicios
set estado='cancelado',
    updated_at=now(),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'readiness_fixture_cleaned',true,
      'readiness_fixture_cleaned_at',now(),
      'readiness_fixture_source','provider-reject'
    )
where id in (
  'f0292929-0000-4000-8000-000000000002',
  'f0292929-0000-4000-8000-000000000003'
)
  and ambiente='demo'
  and descripcion in (
    'READINESS provider-reject idempotency',
    'READINESS provider-reject authorization'
  )
  and estado in ('borrador','buscando','ofrecido','asignado');
