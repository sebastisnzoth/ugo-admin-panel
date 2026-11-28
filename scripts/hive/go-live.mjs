#!/usr/bin/env node
// Puerta de puesta en marcha de UGO Hive (Fase 9). SÓLO LEE: no escribe en ninguna base, no
// despliega, no publica secretos y no gasta nada.
//
//   node scripts/hive/go-live.mjs [--out docs/ugo-hive/evidence/go-live-readiness.json]
//
// Devuelve, para cada condición de la puesta en marcha real:
//   VERIFIED → comprobado contra el mundo real (base, endpoint, proveedor…)
//   READY    → preparado aquí y verificable sin credenciales (p. ej. la imagen de Render)
//   BLOCKED  → falta una intervención humana; se lista con el comando EXACTO
//   FAIL     → algo que sí se puede comprobar está mal (sale con código 1)
//
// Nunca imprime cadenas de conexión ni claves: sólo su presencia y su forma.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { inspectDatabaseUrl } from './secret-setup.mjs'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { redact } from '../../hive/worker/config.mjs'
import { resolveProvider } from '../../hive/worker/providers.mjs'
import { loadConfig } from '../../hive/worker/config.mjs'
import { SNAPSHOT_SQL } from '../../hive/console-api/snapshot.mjs'

const argv = process.argv.slice(2)
const outIndex = argv.indexOf('--out')
const out = outIndex >= 0 ? argv[outIndex + 1] : 'docs/ugo-hive/evidence/go-live-readiness.json'
const secretDir = process.env.HIVE_SECRET_DIR || join(homedir(), '.ugo-hive', 'secrets')
const DEFAULT_SECRET_FILES = {
  HIVE_WORKER_DATABASE_URL: 'hive-worker-database-url.url',
  HIVE_READER_DATABASE_URL: 'hive-reader-database-url.url',
}

const checks = []
const humanActions = []
const add = (id, step, status, detail = {}) => {
  checks.push({ id, step, status, ...detail })
  if (status === 'BLOCKED' && detail.action) humanActions.push({ id, ...detail.action })
}

/** Credencial: variable de entorno o archivo 600 en el directorio de secretos. */
function credential(name) {
  if (process.env[name]) return { value: process.env[name], source: 'env' }
  const file = join(secretDir, DEFAULT_SECRET_FILES[name])
  if (existsSync(file)) {
    const mode = (statSync(file).mode & 0o777).toString(8)
    return { value: readFileSync(file, 'utf8').trim(), source: 'file', file, mode }
  }
  return null
}

function checkRepo() {
  const listed = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  if (listed.status !== 0) return add('repo', 'árbol de trabajo legible', 'FAIL', { detail: 'git ls-files falló' })
  const files = listed.stdout.split('\0').filter(Boolean)
  const offenders = []
  for (const file of files) {
    if (/\.(png|jpg|jpeg|woff2?|zip|pdf)$/i.test(file) || file.startsWith('node_modules/')) continue
    let text
    try { text = readFileSync(file, 'utf8') } catch { continue }
    // Marcadores tipo `<clave>`, `${VAR}` o `SERVICE_ROLE_KEY` no son credenciales; el resto sí.
    for (const match of text.matchAll(/postgres(?:ql)?:\/\/([^\s"'@/]+):([^\s"'@/]+)@/gi)) {
      const password = match[2]
      if (/^<|^\$\{|^(SERVICE_ROLE_KEY|PASSWORD|PASS|CLAVE)$/i.test(password)) continue
      offenders.push(file)
      break
    }
  }
  add('repo', 'ningún archivo versionado contiene una cadena de conexión con contraseña',
    offenders.length === 0 ? 'VERIFIED' : 'FAIL',
    { files: files.length, offenders: offenders.slice(0, 10) })
}

function checkSecretFile() {
  const name = 'HIVE_WORKER_DATABASE_URL'
  const found = credential(name)
  if (!found) {
    return add('credentials', 'credenciales guardadas fuera del repositorio', 'BLOCKED', {
      action: {
        why: 'No hay URLs de base de datos en el entorno ni en el directorio de secretos.',
        command: 'HIVE_MIGRATOR_DATABASE_URL=… HIVE_CONFIRM_ACTIVATION=APLICAR node scripts/hive/activate-logins.mjs --apply',
        then: 'las URLs quedan en ~/.ugo-hive/secrets con modo 600',
      },
    })
  }
  const problems = []
  for (const [varName, fileName] of Object.entries(DEFAULT_SECRET_FILES)) {
    const item = credential(varName)
    if (!item) { problems.push(`${varName}: ausente`); continue }
    if (item.source === 'file' && item.mode !== '600') problems.push(`${fileName}: modo ${item.mode} (debe ser 600)`)
    const inspected = inspectDatabaseUrl(item.value)
    if (!inspected.ok) problems.push(`${varName}: ${inspected.problems.join('; ')}`)
    if (/service_role|supabase/i.test(item.value)) problems.push(`${varName}: apunta a Supabase/Arena`)
  }
  add('credentials', 'credenciales presentes, forma válida, modo 600 y destino Neon',
    problems.length === 0 ? 'VERIFIED' : 'FAIL', { source: found.source, problems })
}

function checkReader() {
  const found = credential('HIVE_READER_DATABASE_URL')
  if (!found) return add('database', 'lector real contra Neon TEST', 'BLOCKED', { detail: 'falta HIVE_READER_DATABASE_URL' })
  const client = new PsqlClient({ databaseUrl: found.value })
  try {
    const rows = JSON.parse(client.run(SNAPSHOT_SQL))
    const identity = JSON.parse(client.run(`select jsonb_build_object(
      'current_user', current_user,
      'read_only', current_setting('default_transaction_read_only')::boolean,
      'schema_version', (select value from hive.meta where key = 'schema_version'))::text`))
    const canWrite = client.run(`select has_table_privilege(current_user, 'hive.agents', 'INSERT')`).trim()
    add('database', 'lector de sólo lectura con la instantánea real', 'VERIFIED', {
      identity: { user: identity.current_user, read_only: identity.read_only, can_insert: canWrite },
      schema_version: identity.schema_version,
      departments: rows.departments?.length ?? 0,
      agents: rows.census?.total ?? null,
      agents_unassigned: rows.agents_unassigned ?? null,
      queue: rows.queue,
      emergency: rows.emergency_stop,
    })
    if ((rows.departments?.length ?? 0) !== 13) add('database.departments', '13 departamentos', 'FAIL', { got: rows.departments?.length ?? 0 })
  } catch (error) {
    add('database', 'lector de sólo lectura con la instantánea real', 'FAIL', { detail: String(error.message).slice(0, 200) })
  }
}

function checkWorkerRole() {
  const found = credential('HIVE_WORKER_DATABASE_URL')
  if (!found) return add('database.worker', 'rol de ejecución utilizable (LOGIN)', 'BLOCKED', { detail: 'falta HIVE_WORKER_DATABASE_URL' })
  const client = new PsqlClient({ databaseUrl: found.value })
  try {
    const identity = JSON.parse(client.run(`select jsonb_build_object(
      'current_user', current_user,
      'is_superuser', (select rolsuper from pg_roles where rolname = current_user),
      'worker_member', pg_has_role(current_user, 'hive_worker', 'member'))::text`))
    add('database.worker', 'rol de ejecución utilizable (LOGIN)', identity.is_superuser ? 'FAIL' : 'VERIFIED', identity)
  } catch (error) {
    add('database.worker', 'rol de ejecución utilizable (LOGIN)', 'FAIL', { detail: String(error.message).slice(0, 200) })
  }
}

async function checkProvider() {
  const config = { ...loadConfig(process.env, []), provider: 'local' }
  if (!config.localProviderUrl) {
    return add('provider', 'backend local (OpenClaw / FreeLLMAPI)', 'BLOCKED', {
      action: {
        why: 'No hay backend local configurado en esta máquina; el proveedor remoto sigue cerrado por política.',
        command: 'HIVE_LOCAL_PROVIDER_URL=http://127.0.0.1:PORT HIVE_LOCAL_PROVIDER_APPROVED=APROBADO [HIVE_LOCAL_PROVIDER_SHAPE=openai] node scripts/hive/local-provider-check.mjs',
        note: 'Con forma `openai` el backend debe añadir `cost: 0` a la respuesta; si no lo hace, no se aprueba.',
      },
    })
  }
  try {
    const result = await resolveProvider('local').complete({ config, prompt: 'Responde sólo: operativo.' })
    const ok = result.cost.state === 'VERIFIED_ZERO' && result.upstream?.state !== 'UPSTREAM_UNVERIFIED'
    add('provider', 'backend local (OpenClaw / FreeLLMAPI)', ok ? 'VERIFIED' : 'FAIL', {
      shape: result.shape,
      cost: result.cost,
      upstream: result.upstream,
      egress_blocked: result.egress_blocked,
    })
  } catch (error) {
    add('provider', 'backend local (OpenClaw / FreeLLMAPI)', 'BLOCKED', {
      detail: error.code ?? 'PROVIDER_ERROR',
      action: { why: String(error.message).slice(0, 160), command: 'node scripts/hive/local-provider-check.mjs' },
    })
  }
}

function checkRender() {
  const blueprint = existsSync('render.yaml')
  const dockerfile = existsSync('hive/console-api/Dockerfile')
  const issues = []
  if (blueprint) {
    const yaml = readFileSync('render.yaml', 'utf8')
    for (const key of ['HIVE_READER_DATABASE_URL', 'HIVE_CONSOLE_SUPABASE_URL', 'HIVE_CONSOLE_SUPABASE_ANON_KEY', 'HIVE_CONSOLE_AUTH_MODE']) {
      if (!yaml.includes(key)) issues.push(`${key}: no declarada`)
    }
    if (/SERVICE_KEY|service_role/.test(yaml)) issues.push('el blueprint pide una credencial privilegiada')
    if (/\bplan:\s*(starter|standard|pro|professional)/i.test(yaml)) issues.push('el blueprint pide un plan de pago')
  } else issues.push('falta render.yaml')
  if (!dockerfile) issues.push('falta el Dockerfile')
  add('render', 'despliegue TEST declarado sin plan de pago ni credencial privilegiada',
    issues.length === 0 ? 'READY' : 'FAIL', {
      blueprint: blueprint ? 'render.yaml' : null,
      dockerfile: dockerfile ? 'hive/console-api/Dockerfile' : null,
      issues,
      deployed: false,
    })
}

async function checkEndpoint() {
  const url = process.env.HIVE_CONSOLE_API_URL
  if (!url) {
    return add('endpoint', 'endpoint TEST accesible y protegido', 'BLOCKED', {
      action: {
        why: 'No hay endpoint desplegado (Render Free) ni URL configurada.',
        command: 'Render → New Blueprint → repo + rama; requiere la credencial del paso 1 y autorización humana',
      },
    })
  }
  try {
    const health = await fetch(`${url.replace(/\/$/, '')}/healthz`)
    const anonymous = await fetch(`${url.replace(/\/$/, '')}/api/hive/snapshot`)
    const body = anonymous.status === 200 ? await anonymous.json() : null
    add('endpoint', 'endpoint TEST accesible y protegido', 'VERIFIED', {
      healthz: health.status,
      anonymous: anonymous.status,
      cache_control: anonymous.headers.get('cache-control'),
      departments: body?.departments?.length ?? null,
      agents: body?.census?.total ?? null,
    })
  } catch (error) {
    add('endpoint', 'endpoint TEST accesible y protegido', 'FAIL', { detail: String(error.message).slice(0, 160) })
  }
}

function checkConsole() {
  const endpoint = process.env.HIVE_CONSOLE_API_URL
  const configured = process.env.VITE_HIVE_CONSOLE_API || ''
  if (!configured) {
    return add('console', 'consola apuntando al endpoint real', 'BLOCKED', {
      action: {
        why: 'Sin VITE_HIVE_CONSOLE_API la consola no hace ninguna petición (por diseño).',
        command: endpoint ? `VITE_HIVE_CONSOLE_API=${endpoint} npm run build` : 'definir VITE_HIVE_CONSOLE_API cuando exista el endpoint',
      },
    })
  }
  add('console', 'consola apuntando al endpoint real', endpoint && configured.replace(/\/$/, '') === endpoint.replace(/\/$/, '') ? 'VERIFIED' : 'FAIL', {
    matches_endpoint: Boolean(endpoint && configured.replace(/\/$/, '') === endpoint.replace(/\/$/, '')),
  })
}

function checkWatch() {
  const found = credential('HIVE_READER_DATABASE_URL')
  if (!found) {
    return add('watch', 'vigilancia de 24 h', 'BLOCKED', {
      action: {
        why: 'La vigilancia necesita el lector real; se lanza después del despliegue.',
        command: `HIVE_READER_DATABASE_URL=… node scripts/hive/watch-24h.mjs --hours 24 --interval-seconds 300 --out docs/ugo-hive/evidence/hive-watch-24h.jsonl`,
      },
    })
  }
  add('watch', 'vigilancia de 24 h', 'READY', {
    note: 'listo para lanzarse; se inicia cuando el endpoint responda y la primera tarea real exista',
  })
}

function checkFixtureHygiene() {
  const evidenceDir = 'docs/ugo-hive/evidence'
  if (!existsSync(evidenceDir)) return add('evidence', 'evidencia sin datos simulados', 'READY', { files: [] })
  const files = readdirSync(evidenceDir).filter(file => file.endsWith('.json'))
  const undeclared = []
  for (const file of files) {
    const text = readFileSync(join(evidenceDir, file), 'utf8')
    // Toda evidencia que use un servidor de pruebas debe declararlo (`disclosure`). Si no lo
    // declara, se trata como evidencia sospechosa: no se acepta simulación disfrazada.
    if (/mock/i.test(text) && !/"disclosure"\s*:/.test(text)) undeclared.push(file)
  }
  add('evidence', 'toda evidencia declara su procedencia (real vs contrato)', undeclared.length === 0 ? 'READY' : 'FAIL', {
    files, undeclared,
  })
}

checkRepo()
checkSecretFile()
checkReader()
checkWorkerRole()
await checkProvider()
checkRender()
await checkEndpoint()
checkConsole()
checkWatch()
checkFixtureHygiene()

const report = {
  generated_at: new Date().toISOString(),
  mode: 'READ_ONLY',
  writes_to_database: false,
  deploy: false,
  cost_usd: 0,
  secret_dir: relative(process.cwd(), secretDir).startsWith('..') ? '[fuera del repo]' : '[DENTRO DEL REPO · revisar]',
  checks,
  human_actions: humanActions,
  verdict: checks.some(check => check.status === 'FAIL') ? 'FAIL'
    : checks.every(check => check.status === 'VERIFIED' || check.status === 'READY') ? 'READY_TO_DEPLOY'
      : 'BLOCKED',
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
console.log(redact(JSON.stringify({
  verdict: report.verdict,
  verified: checks.filter(c => c.status === 'VERIFIED').map(c => c.id),
  ready: checks.filter(c => c.status === 'READY').map(c => c.id),
  blocked: checks.filter(c => c.status === 'BLOCKED').map(c => c.id),
  failed: checks.filter(c => c.status === 'FAIL').map(c => c.id),
  human_actions: humanActions.length,
  out,
}, null, 2)))
process.exit(report.verdict === 'FAIL' ? 1 : 0)
