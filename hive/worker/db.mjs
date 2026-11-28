// UGO Hive · worker runtime · acceso a datos por `psql`.
//
// Decisiones deliberadas:
//  · sin dependencias nuevas (USD 0, sin supply-chain extra): se usa el `psql` del sistema;
//  · la credencial viaja por ENTORNO, nunca por argv ni por logs;
//  · cada operación es una transacción corta propia (contrato del worker en v2.2.0);
//  · los valores se pasan como variables de psql (`:'name'`), que psql escapa como
//    literales: no hay concatenación de SQL con datos de usuario.

import { spawnSync } from 'node:child_process'
import { redact } from './config.mjs'

const PSQL_FLAGS = ['-X', '--no-psqlrc', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1']

export class PsqlClient {
  constructor({ databaseUrl, bin = 'psql', statementTimeoutMs = 15000 }) {
    if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED')
    this.databaseUrl = databaseUrl
    this.bin = bin
    this.statementTimeoutMs = statementTimeoutMs
  }

  run(sql, vars = {}) {
    const args = [...PSQL_FLAGS]
    for (const [key, value] of Object.entries(vars)) args.push('-v', `${key}=${value}`)
    args.push('-f', '-')
    const result = spawnSync(this.bin, args, {
      input: sql,
      encoding: 'utf8',
      timeout: this.statementTimeoutMs + 5000,
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        // La URL va por entorno: no aparece en `ps`.
        PGHOST: undefined, PGPORT: undefined, PGUSER: undefined, PGDATABASE: undefined,
        PGCONNECT_TIMEOUT: '10',
        PGOPTIONS: `-c statement_timeout=${this.statementTimeoutMs} -c application_name=ugo-hive-worker`,
        ...this.#connectionEnv(),
      },
    })
    if (result.error) throw new Error(`PSQL_SPAWN_FAILED: ${result.error.message}`)
    if (result.status !== 0) {
      const message = redact((result.stderr || '').trim().split('\n').slice(-3).join(' | '))
      const error = new Error(`PSQL_FAILED: ${message}`)
      error.stderr = message
      error.code = /ERROR:\s+([A-Z_]{4,})/.exec(result.stderr || '')?.[1] ?? 'PSQL_FAILED'
      throw error
    }
    return (result.stdout || '').trim()
  }

  /** Ejecuta y devuelve el JSON de la última línea no vacía. */
  json(sql, vars = {}) {
    const output = this.run(sql, vars)
    const line = output.split('\n').map(text => text.trim()).filter(Boolean).pop()
    if (!line) return null
    return JSON.parse(line)
  }

  #connectionEnv() {
    // psql acepta la URL como argumento de conexión; se pasa por `PG*` para no exponerla.
    const url = this.databaseUrl
    try {
      const parsed = new URL(url)
      const env = {
        PGHOST: parsed.hostname,
        PGPORT: parsed.port || '5432',
        PGUSER: decodeURIComponent(parsed.username),
        PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'hive',
        PGSSLMODE: parsed.searchParams.get('sslmode') || 'prefer',
      }
      if (parsed.password) env.PGPASSWORD = decodeURIComponent(parsed.password)
      return env
    } catch {
      return {}
    }
  }
}

/** Identidad y privilegios reales de la conexión (Sentinel los exige). */
export function connectionFacts(client) {
  return client.json(`
    select jsonb_build_object(
      'current_user', current_user,
      'database', current_database(),
      'is_superuser', (select rolsuper from pg_roles where rolname = current_user),
      'is_worker_member', pg_has_role(current_user, 'hive_worker', 'member'),
      'server_encoding', current_setting('server_encoding')
    )::text;
  `)
}
