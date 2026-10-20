# UGO — Document Index

> Single entry point for the living documentation. Prevents “which MD is truth?” drift noted in 2026-10 audits.
> Rule: `README.md` + `ARCHITECTURE.md` + `SECURITY.md` + this index are canonical. Everything else is either active master or archived evidence.

## Canonical (always read first)
| Path | Role | When to update |
|------|------|----------------|
| `README.md` | Product + stack + flow + DONE definition | Stack, routes, env groups change |
| `ARCHITECTURE.md` | Layers + dependency rules | src/api/server boundaries change |
| `SECURITY.md` | Secrets + auth + RLS + rate limits | Auth, LLM boundary, CORS, Supabase policy changes |
| `CONTRIBUTING.md` | PR + review + DONE checklist | Process changes |
| `DEPLOY.md` | Vercel/Netlify + budget + release | Hosting, budget, publish rules change |
| `DESIGN.md` / `UX-CONTRACT.md` | Visual tokens + behavior | Design system changes |
| `docs/INDEX.md` (this file) | Document map | Any doc added/retired |

## Active Masters (living contracts)
| Path | Owner | Scope |
|------|-------|-------|
| `docs/UGO_CAMINO_MAESTRO.md` | Product lead | Path to first reliable service + autonomous company decision log |
| `docs/UGO_ROADMAP_MASTER.md` | Product lead | Madurez → checkpoint → blockers board |
| `docs/PRODUCTION_READINESS.md` | Release gate | PHYSICAL + SAME-SHA gate checklist |
| `docs/UGO_ARQUITECTURA_TECNICA_MASTER.md` | Tech lead | Stack + surfaces + dev-public isolation |
| `docs/UGO_DATA_BACKEND_MASTER.md` | Backend | serviceId, estados, matching, RLS/RPC invariants |
| `docs/UGO_TESTING_RELEASE_MASTER.md` | QA | L0→L7 quality gates + Sentinel rule |
| `docs/HUGO_BACKEND_SECURITY_ARCHITECTURE.md` | Security | Hugo request flow + contextPolicy + rate limits |
| `docs/PAYMENTS_MULTIPAIS_PHASE1.md` | Finance | Multi-country payment routing |
| `docs/MVP_OPERATIONAL_FLOW.md` | Ops | Client→Provider→Admin lifecycle |
| `docs/FRONTEND_ARCHITECTURE_FOUNDATION.md` | FE | Client CSS + feature boundaries |
| `docs/UGO_CSS_MIGRATION_LEDGER.md` | FE | CSS migration + frozen debt |
| `docs/UGO_TWO_DEVICE_PHYSICAL_RUNBOOK.md` | QA | Two-phone E2E steps |
| `docs/UGO_AUTONOMOUS_CORPORATION_MASTER.md` | Autonomy | Departments + agent roster |
| `docs/PROVIDER_FRONTEND_MIGRATION.md` | FE | Provider shell migration |

## Archive / Evidence (do not treat as current truth)
These remain in repo root as evidence snapshots. Read via this index — do not link as “current”.

| File | Date | Replaced by |
|------|------|-------------|
| `AUDITORIA_2026-10-09.md` | 2026-10-09 | `AUDITORIA_2026-10-13.md` → next audit |
| `AUDITORIA_2026-10-13.md` | 2026-10-13 | Living docs above + `docs/UGO_AUDIT_*.md` |
| `AUDITORIA_MAIN_2026-09-10.md` | 2026-09-10 | Same |
| `BUGS_RC1.md` | 2026-10-10 | `docs/PRODUCTION_READINESS.md` blockers + GitHub issues |
| `MEJORAS_2026-10-10.md` | 2026-10-10 | `docs/UGO_CSS_MIGRATION_LEDGER.md` + roadmap |
| `MEJORAS_UIUX_CLIENTE_PROVEEDOR_2026-10-11.md` | 2026-10-11 | `DESIGN.md` + `UX-CONTRACT.md` |
| `FIX_PROMPTS.md` / `AUDIT_PROMPTS.md` / `MASTER_PROMPT.md` | 2026-09 | Code + contracts are source of truth |
| `UGO_MASTER_CTO.md`, `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md` | 2026-09 | Masters above |
| `PLAN_REDISENO_UI_UGO.md`, `CHECKLIST_UGO_STITCH.md` | Stitch phase | `docs/penpot-implementation-matrix.md` |

> New evidence docs must go to `docs/evidence/<YYYY-MM-DD>-topic.md` or `docs/readiness/*`, not repo root. Root stays ≤10 MDs.

## New contracts added (audit 2026-10-20)
### Batch 1 — payments + tests/docs index
- `tests/contracts/payment-webhook-hardening.test.mjs` — POST-only + x-signature + uniform 200 + timingSafeEqual
- `tests/contracts/rls-table-coverage.test.mjs` — 19 critical tables require `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` in migrations
- `tests/contracts/realtime-helper-usage.test.mjs` — S-02 `subscribeRealtimeChannel` is canonical; flags raw 1500ms admin path
- `tests/contracts/no-global-fetch-override.test.mjs` — only `lib/apiRuntime.ts` + `DemoSebastianPaymentBridge.tsx` (TEST-gated, demo=false) may patch `window.fetch`
- `api/pagos/webhook.ts` hardened: `MERCADO_PAGO_WEBHOOK_SECRET` (HMAC `id:{id};request-id:{id};ts:{ts};`), 405 on non-POST, uniform `{received:true}`
- `.env.example` documents `MERCADO_PAGO_WEBHOOK_SECRET` bootstrap mode

### Batch 2 — security P0 (stale project + CORS + clickjacking + WhatsApp)
- `tests/contracts/security-p0-hardening.test.mjs` (9) — proxy CORS allowlist (no `*`), AdminPanel/AdvancedSections single-source `supabaseProject`, vite `SAMEORIGIN` guard, WhatsApp header secret + inbound 429, rateLimit KB
- `api/proxy.js` — `Access-Control-Allow-Origin: *` → explicit allowlist (`sebastisnzoth.github.io`, `ugo-admin-panel.vercel.app`, `UGO_ALLOWED_BROWSER_ORIGINS`) + `Vary: Origin` + 403 on unknown browser origin
- `src/components/AdminPanel.tsx` + `AdvancedSections.tsx` — `byajcqrgetloavrgyqak.supabase.co` + legacy anon key → `UGO_SUPABASE_URL`/`UGO_SUPABASE_PUBLISHABLE_KEY`/`UGO_SUPABASE_PROJECT_REF` (single source)
- `vite.config.ts` — unconditional `ALLOWALL` → conditional `UGO_ALLOW_EMBED=true` → `ALLOWALL` else `SAMEORIGIN` (preview + build), documents anti-clickjacking default
- `api/whatsapp/send.js` — secret via `x-webhook-secret`/`x-hub-signature` header preferred (query `?hook=` deprecated + warning), inbound per-phone 20/min `429`, reduced `listUsers` `1000→200`
- `server/hugo/rateLimit.ts` — documents per-isolate best-effort + durable KV/WAF guidance
- `.env.example` — `UGO_WHATSAPP_WEBHOOK_SECRET` (header, not query) + `UGO_ALLOW_EMBED`

## How to retire a doc
1. Move to `docs/archive/<year>/` (git mv, keep history)
2. Add redirect line at top: `> Archived — see <new path> · YYYY-MM-DD`
3. Update this index table
4. No doc deletion without replacement link

## Ownership rule (from AGENTS.md)
If lifecycle, money, permisos, RPC/API, matching, evidencia, UX canónica, arquitectura, agents, quality gates, readiness o release cambian, actualizar en el mismo bloque los masters afectados + this index.
