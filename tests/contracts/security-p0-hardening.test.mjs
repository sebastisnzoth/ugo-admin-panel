import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('api/proxy.js no longer uses wildcard CORS (privileged Admin create-user)', () => {
  const src = fs.readFileSync('api/proxy.js', 'utf8')
  assert.doesNotMatch(src, /Access-Control-Allow-Origin.*\*'/)
  assert.doesNotMatch(src, /"\*"/)
  assert.match(src, /allowedOrigin/)
  assert.match(src, /UGO_BROWSER_ORIGINS/)
  assert.match(src, /Vary.*Origin/)
  assert.match(src, /Origen no autorizado/)
})

test('api/proxy.js allowlist includes canonical TEST origins', () => {
  const src = fs.readFileSync('api/proxy.js', 'utf8')
  assert.match(src, /sebastisnzoth\.github\.io/)
  assert.match(src, /ugo-admin-panel\.vercel\.app/)
  assert.match(src, /UGO_ALLOWED_BROWSER_ORIGINS/)
})

test('AdminPanel stale project hardcoded values removed (single source of truth)', () => {
  const admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8')
  assert.doesNotMatch(admin, /byajcqrgetloavrgyqak\.supabase\.co/)
  assert.match(admin, /UGO_SUPABASE_URL/)
  assert.match(admin, /UGO_SUPABASE_PROJECT_REF/)
  assert.match(admin, /from.*supabaseProject/)
})

test('AdvancedSections SecImportProviders uses single source of truth (not legacy byajcqr key)', () => {
  const src = fs.readFileSync('src/components/AdvancedSections.tsx', 'utf8')
  assert.doesNotMatch(src, /byajcqrgetloavrgyqak/)
  assert.doesNotMatch(src, /sb_publishable_wAkmRZHwX9ddcZ/)
  assert.match(src, /UGO_SUPABASE_URL/)
  assert.match(src, /UGO_SUPABASE_PUBLISHABLE_KEY/)
  assert.match(src, /supabaseProject/)
})

test('vite.config.ts no longer unconditional ALLOWALL (clickjacking guard)', () => {
  const src = fs.readFileSync('vite.config.ts', 'utf8')
  // Must have conditional allowEmbed guard, not bare ALLOWALL
  assert.match(src, /UGO_ALLOW_EMBED/)
  assert.match(src, /SAMEORIGIN/)
  assert.match(src, /allowEmbed.*ALLOWALL|ALLOWALL.*allowEmbed/s)
  // Preview must be SAMEORIGIN (not ALLOWALL)
  assert.match(src, /preview:[\s\S]*SAMEORIGIN/)
})

test('api/whatsapp/send.js prefers header secret over query (no log leakage)', () => {
  const src = fs.readFileSync('api/whatsapp/send.js', 'utf8')
  assert.match(src, /x-webhook-secret|x-hub-signature/i)
  assert.match(src, /headerSecret/)
  assert.match(src, /deprecated.*query string|query string.*deprecated/i)
})

test('api/whatsapp/send.js has inbound rate-limit (per phone) and reduced listUsers scan', () => {
  const src = fs.readFileSync('api/whatsapp/send.js', 'utf8')
  assert.match(src, /WA_INBOUND_BUCKETS|allowInbound/)
  assert.match(src, /429/)
  assert.match(src, /perPage:200/)
  assert.doesNotMatch(src, /perPage:1000/)
})

test('server/hugo/rateLimit.ts documents per-isolate limitation + durable KV guidance', () => {
  const src = fs.readFileSync('server/hugo/rateLimit.ts', 'utf8')
  assert.match(src, /per.*isolate|per-isolate/i)
  assert.match(src, /WAF|KV|Upstash|Redis/i)
  assert.match(src, /best-effort/i)
})

test('.env.example documents new security env vars', () => {
  const env = fs.readFileSync('.env.example', 'utf8')
  assert.match(env, /UGO_WHATSAPP_WEBHOOK_SECRET/)
  assert.match(env, /x-webhook-secret/)
  assert.match(env, /UGO_ALLOW_EMBED/)
  assert.match(env, /SAMEORIGIN|clickjacking/i)
})
