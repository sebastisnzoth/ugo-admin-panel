-- UGO TEST: prevent new hashless append-only autonomous evidence.
-- Historical rows are intentionally left untouched: immutable audit history must not be rewritten.
-- SHA-256 is a checksum of the row at insertion, not independent verification of execution.
create or replace function private.autonomous_evidence_hash_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.evidence_hash is null or btrim(new.evidence_hash) = '' then
    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      || jsonb_build_object('_ugo_hash_provenance', 'generated_at_insert_v1');
    new.evidence_hash := encode(
      sha256(
        convert_to(
          jsonb_build_object(
            'job_id', new.job_id,
            'evidence_type', new.evidence_type,
            'reference', new.reference,
            'metadata', new.metadata,
            'correlation_id', new.correlation_id,
            'created_at', new.created_at
          )::text,
          'UTF8'
        )
      ),
      'hex'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.autonomous_evidence_hash_on_insert() from public, anon, authenticated;

drop trigger if exists autonomous_evidence_hash_insert on public.autonomous_evidence_ledger;
create trigger autonomous_evidence_hash_insert
before insert on public.autonomous_evidence_ledger
for each row execute function private.autonomous_evidence_hash_on_insert();

-- Do not alter autonomous_evidence_immutable or backfill historical evidence here.
