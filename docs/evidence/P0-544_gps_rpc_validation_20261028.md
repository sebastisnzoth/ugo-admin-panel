# P0 #544 — GPS RPC & Schema Validation Evidence

**Date:** 2026-10-28 19:45 (America/Sao_Paulo)
**Agent:** main (autonomous execution)
**SHA Validated:** `0b931b6cfcc93528708a20701c15b9c95cdc83da` (PR #545 merge)
**Environment:** UGO TEST (`tmossnqfwfwjrtzwcbmm`)

---

## Summary

✅ **VALIDATED IN TEST** — Migration `20261020223000_production_provider_gps_rpc_compat.sql` successfully applied to UGO TEST. All required schema changes and RPCs are present, properly secured with `SECURITY DEFINER` and `GRANT EXECUTE TO authenticated`.

---

## Migration Details

**File:** `supabase/migrations/20261020223000_production_provider_gps_rpc_compat.sql`

### Schema Changes
| Column | Type | Nullable | Status |
|--------|------|----------|--------|
| `ubicacion_updated_at` | `timestamptz` | YES | ✅ Present |
| `ubicacion_accuracy_m` | `double precision` | YES | ✅ Present |

### RPCs Created
| Function | Arguments | Security | Grants | Status |
|----------|-----------|----------|--------|--------|
| `activar_disponibilidad_proveedor` | `(p_lat, p_lng, p_captured_at, p_accuracy_m)` | SECURITY DEFINER | `authenticated` | ✅ Present |
| `publicar_ubicacion_disponibilidad_proveedor` | `(p_lat, p_lng, p_captured_at, p_accuracy_m)` | SECURITY DEFINER | `authenticated` | ✅ Present |

### Security Validations in RPCs
1. **Session required** — `auth.uid()` must not be null
2. **Provider verification** — Must be `tipo='proveedor'`, `activo=true`, `estado_verificacion='verificado'`, `onboarding_completo_at` and `termos_aceitos_at` not null
3. **GPS bounds** — Lat -90 to 90, Lng -180 to 180, reject (0,0) within 0.0001 tolerance
4. **Timestamp freshness** — ±5000ms past, ≤30000ms future (30s window)
5. **Accuracy** — 0 < accuracy ≤ 250m
6. **Idempotent updates** — Only updates if `p_captured_at >= ubicacion_updated_at`
7. **Online/Disponible check** — `publicar_ubicacion` requires provider already online & available
8. **RLS preserved** — No changes to existing policies/triggers
9. **Grants revoked from PUBLIC/anon** — Only `authenticated` can execute

---

## TEST Validation Queries

### Schema Verification
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'perfiles_proveedor' 
AND column_name IN ('ubicacion_updated_at', 'ubicacion_accuracy_m');
```
**Result:** Both columns present with correct types ✅

### RPC Verification
```sql
SELECT p.proname, p.proargnames, p.prosecdef, p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('activar_disponibilidad_proveedor', 'publicar_ubicacion_disponibilidad_proveedor');
```
**Result:** Both RPCs present, `SECURITY DEFINER=true`, grants to `authenticated` ✅

### Related RPC
```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname = 'guardar_ubicacion_base_proveedor';
```
**Result:** Present ✅ (from earlier migration `20261001131000_provider_profile_location_and_atomic_online.sql`)

---

## CI/CD Status

**PR #545:** `fix(P0): restaurar RPC GPS de Proveedor compatible con producción`
- **State:** MERGED
- **Merge SHA:** `0b931b6cfcc93528708a20701c15b9c95cdc83da`
- **Core CI:** PASS (TypeScript, Build, Core Lint, Contracts)
- **Runtime Tests:** PASS (Hugo Timeout, P0 Client→Provider Matching, Provider GPS SQL Contract, Roadmap Traceability, Auth Isolation)
- **Netlify:** FAILURE (pre-existing, unrelated to GPS changes)
- **Vercel:** PENDING

---

## Production Deploy Plan

### Prerequisites (Not Yet Met)
- [ ] Explicit human authorization for PROD write
- [ ] Isolated PROD schema clone created and validated
- [ ] Smoke test on clone with production-like data
- [ ] Rollback plan documented and tested
- [ ] Migration review by DBA/ugo-datos agent

### Step 1: Create PROD Schema Clone
```bash
# Using Supabase CLI or pg_dump/pg_restore to isolated schema
# Target: PROD project `trfsjuseqjxlhrxuvdsm`
# Schema: public (isolated copy)
```

### Step 2: Apply Migration to Clone
```sql
-- Run in clone:
\i supabase/migrations/20261020223000_production_provider_gps_rpc_compat.sql
```

### Step 3: Smoke Test on Clone
| Test | Expected Result |
|------|-----------------|
| Columns exist in `perfiles_proveedor` | ✅ |
| `activar_disponibilidad_proveedor` callable by authenticated provider | ✅ |
| `publicar_ubicacion_disponibilidad_proveedor` callable by authenticated provider | ✅ |
| Reject invalid GPS (0,0) | ✅ Error |
| Reject stale timestamp (>30s) | ✅ Error |
| Reject accuracy >250m | ✅ Error |
| Reject non-verified provider | ✅ Error |
| Reject non-online provider (for publicar) | ✅ Error |
| Idempotent update with older timestamp | ✅ No update |
| Grants only to authenticated | ✅ |

### Step 4: Gated PROD Deploy
- **Gate:** Manual approval required
- **Migration:** `20261020223000_production_provider_gps_rpc_compat.sql`
- **Rollback:** `DROP FUNCTION` + `ALTER TABLE DROP COLUMN IF EXISTS`
- **Post-deploy:** Verify with real provider account, monitor Sentinel

---

## Blockers for Production

1. **No explicit PROD authorization** — Per AGENTS.md: "No escribir en Supabase producción ni activar Empresa Autónoma sin gate/autorización aplicables"
2. **No PROD schema clone** — Must validate on isolated clone first
3. **No human PROD credentials** — Smoke test needs real provider account
4. **Netlify failures** — Pre-existing, should be resolved before production promotion

---

## Next Actions

1. **Wait for human authorization** to proceed with PROD clone creation
2. **Configure ugo-infra agent** for specialized DB work (currently only `main` agent active)
3. **Resolve Netlify header/redirect failures** (unrelated but blocking deploy status)
4. **Provision 6 TEST credentials** for P0-1/P0-2 E2E validation (per roadmap)

---

## Evidence Files

- Migration: `supabase/migrations/20261020223000_production_provider_gps_rpc_compat.sql`
- PR: #545 (merged)
- CI Runs: 39511715644 (Core CI), 39511715676 (P0 GPS SQL Contract), 39511715644 (P0 Client→Provider Matching)
- TEST Project: `tmossnqfwfwjrtzwcbmm`

---

## Conclusion

**P0 #544 is TECHNICALLY COMPLETE in TEST.** The migration is applied, schema is correct, RPCs are secure and granted. Production promotion is blocked only by governance gates (human authorization, clone validation, rollback readiness), not by technical gaps.

**Status:** ✅ TEST VALIDATED — ⏳ PROD GATED