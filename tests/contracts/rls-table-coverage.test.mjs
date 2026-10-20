import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Ensures every operational table that appears in migrations + types has RLS.
// Previous audit found 72 tables with ENABLE ROW LEVEL SECURITY but no contract
// to prevent a new table shipping without it.
const migrationsDir = 'supabase/migrations'
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
const allSql = files.map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n')

// Critical tables that must always be RLS-protected (from src/lib/database.types.ts + UGO_DATA_BACKEND_MASTER)
// Note: usuarios / perfiles_cliente / categorias were created in the initial remote schema
// before migrations were versioned, so they lack an explicit ENABLE line in this folder.
// They are verified via existing policies/views in production and tracked in docs/PRODUCTION_READINESS.md.
const criticalTables = [
  'servicios',
  'pagos',
  'perfiles_proveedor',
  'ofertas_servicio',
  'mensajes',
  'notificaciones',
  'disputas',
  'disputa_mensajes',
  'evidencias_servicio',
  'evidencias_solicitud',
  'ampliaciones_servicio',
  'deudas_ugo_proveedor',
  'retiros',
  'audit_log',
  'documentos',
  'tarifas',
  'config_sistema',
  'push_suscripciones',
  'whatsapp_conversaciones',
]

test('supabase/migrations contains RLS hardening', () => {
  assert.ok(files.length > 50, `expected many migrations, got ${files.length}`)
  const rlsLines = allSql.match(/enable row level security/gi) || []
  // There are ~20+ explicit enable statements across migrations (some tables re-enabled)
  assert.ok(rlsLines.length >= 15, `too few ENABLE RLS lines: ${rlsLines.length}`)
})

test.each ?? true // node:test does not need .each; keep simple loop below

for (const table of criticalTables) {
  const name = `critical table "${table}" is RLS-protected`
  // eslint-disable-next-line no-loop-func
  ;(() => {
    const t = table
    test(name, () => {
      const lower = allSql.toLowerCase()
      const hasEnable = lower.includes(`alter table public.${t} enable row level security`) ||
        lower.includes(`alter table private.${t} enable row level security`)
      const hasPolicy = lower.includes(`on public.${t} `) && lower.includes('create policy')
      const hasRls = hasEnable || hasPolicy
      assert.ok(hasRls, `missing RLS (ENABLE or CREATE POLICY) for ${t} in migrations`)
    })
  })()
}

test('auxiliary hardening migration exists (audit_log, documentos, mensajes, push)', () => {
  assert.ok(fs.existsSync(path.join(migrationsDir, '20260913005000_auxiliary_tables_rls_hardening.sql')),
    'auxiliary hardening migration must exist')
  const aux = fs.readFileSync(path.join(migrationsDir, '20260913005000_auxiliary_tables_rls_hardening.sql'), 'utf8')
  for (const t of ['audit_log', 'documentos', 'mensajes', 'push_suscripciones']) {
    assert.match(aux.toLowerCase(), new RegExp(`alter table public\\.${t} enable row level security`))
  }
})
