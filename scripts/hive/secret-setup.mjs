#!/usr/bin/env node
// Configuración SEGURA de las credenciales de Hive (sin exponerlas).
//
// Nunca se escribe una URL/contraseña en el repositorio, en un log ni en argv: se lee del
// entorno (o de un archivo con permisos 600) y se envía por STDIN a `gh secret set`.
//
//   HIVE_WORKER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --check
//   HIVE_WORKER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --connect
//   HIVE_WORKER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --set-github-secret
//   HIVE_READER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --set-github-secret HIVE_READER_DATABASE_URL
//
// No crea usuarios: sólo clasifica y publica lo que ya existe.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { redact } from '../../hive/worker/config.mjs'

const argv = process.argv.slice(2)
const flag = name => argv.includes(`--${name}`)

const SECRET_NAMES = {
  HIVE_WORKER_DATABASE_URL: 'worker',
  HIVE_READER_DATABASE_URL: 'reader',
}

/** Clasifica una URL sin revelarla. Puras comprobaciones de forma; no conecta. */
export function inspectDatabaseUrl(raw) {
  const problems = []
  if (!raw) return { ok: false, code: 'MISSING', problems: ['variable vacía'] }
  let url
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, code: 'INVALID_URL', problems: ['no es una URL válida'] }
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) problems.push('el esquema debe ser postgresql://')
  const host = url.hostname.toLowerCase()
  if (host.includes('supabase')) problems.push('apunta a Supabase/Arena: Hive no usa Arena')
  if (!host.endsWith('neon.tech')) problems.push('el host no es de Neon (esperado *.neon.tech)')
  const sslmode = url.searchParams.get('sslmode') || ''
  if (!['require', 'verify-full', 'verify-ca'].includes(sslmode)) problems.push('falta sslmode=require (o verify-full)')
  const user = decodeURIComponent(url.username || '')
  if (!user) problems.push('falta el usuario')
  if (/^(postgres|neondb_owner|cloud_admin|superuser)/i.test(user)) problems.push(`usuario privilegiado: ${user}`)
  if (!url.password) problems.push('falta la contraseña en la URL')
  if (url.searchParams.has('password')) problems.push('la contraseña va en el parámetro password=, no en la URL')
  return {
    ok: problems.length === 0,
    code: problems.length === 0 ? 'VALID' : 'INVALID',
    problems,
    shape: {
      scheme: url.protocol.replace(':', ''),
      host_kind: host.endsWith('neon.tech') ? 'neon' : 'other',
      database: url.pathname.replace(/^\//, '') || null,
      user_kind: /^hive_app$/.test(user) ? 'worker-login' : /^hive_console_ro$/.test(user) ? 'reader-login' : 'otro',
      sslmode: sslmode || null,
    },
  }
}

export function readSecret(name, env = process.env) {
  if (env[`${name}_FILE`]) return readFileSync(env[`${name}_FILE`], 'utf8').trim()
  return (env[name] || '').trim()
}

function setGithubSecret(name, value, { repo = process.env.GITHUB_REPOSITORY || 'sebastisnzoth/ugo-admin-panel' } = {}) {
  // `gh` lee el secreto de stdin: el valor no aparece en `ps` ni en el historial.
  const result = spawnSync('gh', ['secret', 'set', name, '--repo', repo], { input: value, encoding: 'utf8' })
  return {
    ok: result.status === 0,
    name,
    repo,
    stderr: result.status === 0 ? '' : redact((result.stderr || '').trim()).slice(0, 300),
  }
}

async function main() {
  const requested = argv.find(arg => SECRET_NAMES[arg])
  const value = readSecret(requested ?? 'HIVE_WORKER_DATABASE_URL')
  const name = requested ?? 'HIVE_WORKER_DATABASE_URL'
  const report = inspectDatabaseUrl(value)

  if (flag('set-github-secret')) {
    if (!report.ok) {
      console.log(JSON.stringify({ ok: false, code: 'REFUSED', name, inspection: report }, null, 2))
      process.exit(3)
    }
    const pushed = setGithubSecret(name, value)
    console.log(JSON.stringify({ ...pushed, inspection: { ...report, code: 'VALID' } }, null, 2))
    process.exit(pushed.ok ? 0 : 4)
  }

  if (flag('connect')) {
    if (!report.ok || !value) {
      console.log(JSON.stringify({ ok: false, code: 'REFUSED', inspection: report }, null, 2))
      process.exit(3)
    }
    const { PsqlClient, connectionFacts } = await import('../../hive/worker/db.mjs')
    const client = new PsqlClient({ databaseUrl: value })
    const facts = connectionFacts(client)
    const privileged = facts.is_superuser === true
    console.log(JSON.stringify({
      ok: !privileged,
      code: privileged ? 'PRIVILEGED_CONNECTION' : 'CONNECTED',
      inspection: report,
      connection: { user: facts.current_user, database: facts.database, is_superuser: facts.is_superuser },
    }, null, 2))
    process.exit(privileged ? 3 : 0)
  }

  console.log(JSON.stringify({ ok: report.ok, name, inspection: report }, null, 2))
  process.exit(report.ok ? 0 : 3)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(JSON.stringify({ ok: false, code: 'CRASH', error: redact(String(error?.message ?? error)) }))
    process.exit(1)
  })
}
