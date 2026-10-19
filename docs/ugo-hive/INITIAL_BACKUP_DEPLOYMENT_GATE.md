# UGO Hive — initial encrypted snapshot gate (TEST only)

2026-10-19. Scope: Supabase Arena TEST `tmossnqfwfwjrtzwcbmm`; no production mutations.

## Implemented
- PR #521 permits an authenticated one-time first snapshot using `If-None-Match: *`, only when no committed version exists.
- `hive_commit_backup` uses a PostgreSQL transaction advisory lock and compares current version against expected `NULL`, preventing concurrent first writers from both committing.
- The normal upload path still requires `If-Match: "<uuid>"`. The handler validates its token, bounded binary envelope prefix, SHA-256 and content length. Encryption/decryption is performed by FreeLLMAPI, not this service.
- Contract test file and a dedicated GitHub Actions workflow have been added.

## Operational state and gates
- Existing Arena backup bucket is private, has a 5 MiB per-object limit; uploads larger than this will fail even though the handler caps at 8 MiB. Keep initial test backup well below 5 MiB; do not silently loosen limits.
- Supabase deployed receiver remains VERSION 1 until separately verified as updated. Do not bootstrap against v1.
- Operator secrets reside in Render draft form and Supabase secrets; they are NOT accessible to the connector. Never expose them in logs, chat, commits, GitHub Actions or frontend.
- A real, valid, *encrypted with the Render-configured backup key* seed must be provisioned with a trusted secret-bearing client. SQL-only fabrication is not acceptable.
- After seeding, authorized GET must return the exact blob with matching SHA-256 and version ETag; decrypt, gunzip, SQLite quick_check and restart restore are mandatory real proof.
- A Render service is NOT present in account inventory at this checkpoint. Do not create it without the already-configured secrets; the draft UI variables cannot be read from the Render connector.
- FREEAPI_HIVE_LOCKDOWN=true and FREEAPI_DB_BACKUP_STRICT=true must remain enforced, with inference disabled.

## Rollback
If the handler deploy fails, redeploy the known v1 index.ts and handler.mjs from main WITHOUT modifying the Hive SQL tables or deleting Storage objects. Never delete an existing committed snapshot as rollback.

## Classification
SQL+bucket VERIFIED previously; one-time bootstrap code IMPLEMENTED_NOT_VERIFIED; real restore HUMAN_REQUIRED; Render deployment BLOCKED pending verified restore and secrets; production UNCHANGED.
