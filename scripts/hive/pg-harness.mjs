// Real PostgreSQL harness for UGO Hive concurrency evidence.
//
// PGlite (embedded) validates invariants but serialises everything: it cannot prove
// anything about concurrent sessions. This harness starts a real PostgreSQL server
// (binaries from the `pgserver` pip wheel, or any POSTGRES_BIN directory) and runs
// independent `psql` processes so locking, SKIP LOCKED and fencing are exercised by
// genuinely separate connections.
//
// Install once:  python3 -m venv /tmp/pgenv && /tmp/pgenv/bin/pip install pgserver
// Discovery:     POSTGRES_BIN=/path/to/bin  (optional)

import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

const REQUIRED = ['initdb', 'pg_ctl', 'psql', 'createdb']

function candidateDirs() {
  const dirs = []
  if (process.env.POSTGRES_BIN) dirs.push(process.env.POSTGRES_BIN)
  const venvRoot = process.env.PG_VENV || '/tmp/pgenv'
  for (const lib of ['lib/python3.11', 'lib/python3.12', 'lib/python3.13', 'lib/python3.10']) {
    dirs.push(join(venvRoot, lib, 'site-packages', 'pgserver', 'pginstall', 'bin'))
  }
  for (const base of ['/usr/lib/postgresql']) {
    if (existsSync(base)) {
      for (const version of readdirSync(base)) dirs.push(join(base, version, 'bin'))
    }
  }
  dirs.push('/usr/bin', '/usr/local/bin', '/opt/homebrew/bin')
  return dirs
}

/** Returns the directory that holds a complete PostgreSQL bin set, or null. */
export function findPostgresBin() {
  for (const dir of candidateDirs()) {
    if (REQUIRED.every(binary => existsSync(join(dir, binary)))) return dir
  }
  return null
}

export const postgresAvailable = () => findPostgresBin() !== null

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

/** Starts a throwaway server with a database named `hive`. Returns a client object. */
export async function startPostgres({ database = 'hive' } = {}) {
  const bin = findPostgresBin()
  if (!bin) throw new Error('POSTGRES_BIN_UNAVAILABLE')
  const dir = mkdtempSync(join(tmpdir(), 'ugo-hive-pg-'))
  const data = join(dir, 'data')
  const socketDir = dir
  const port = await freePort()

  const run = (cmd, args, options = {}) =>
    spawnSync(join(bin, cmd), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })

  // Neon crea las bases en UTF8. Un initdb sin --encoding produce SQL_ASCII, donde
  // lower()/translate() trabajan byte a byte y los acentos se corrompen: la réplica
  // dejaría de ser una réplica.
  const init = run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust',
    '--encoding=UTF8', '--locale=C.UTF-8'])
  if (init.status !== 0) throw new Error(`INITDB_FAILED: ${init.stderr}`)

  const start = run('pg_ctl', ['-D', data, '-w', '-t', '30', '-l', join(dir, 'server.log'),
    '-o', `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=${socketDir} -c fsync=off -c full_page_writes=off`, 'start'])
  if (start.status !== 0) throw new Error(`PG_START_FAILED: ${start.stderr || start.stdout}`)

  const dsn = `host=127.0.0.1 port=${port} user=postgres`
  const created = run('createdb', ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', database])
  if (created.status !== 0) throw new Error(`CREATEDB_FAILED: ${created.stderr}`)

  const psql = (sql, { target = database, vars = {} } = {}) => {
    const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'postgres', PGDATABASE: target }
    const settings = Object.entries(vars).map(([key, value]) => `-c ${key}=${value}`).join(' ')
    if (settings) env.PGOPTIONS = settings
    const result = spawnSync(join(bin, 'psql'), ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
    if (result.status !== 0) throw new Error(`PSQL_FAILED: ${result.stderr.trim() || result.stdout}`)
    return result.stdout.trim()
  }

  const psqlFile = (file, { target = database, vars = {}, singleTransaction = false } = {}) => {
    const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'postgres', PGDATABASE: target }
    const settings = Object.entries(vars).map(([key, value]) => `-c ${key}=${value}`).join(' ')
    if (settings) env.PGOPTIONS = settings
    const args = ['-X', '-q', '-v', 'ON_ERROR_STOP=1']
    if (singleTransaction) args.push('--single-transaction')
    args.push('-f', file)
    const result = spawnSync(join(bin, 'psql'), args, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
    return { ok: result.status === 0, stdout: result.stdout, stderr: result.stderr }
  }

  /** Runs the same SQL in N independent sessions that overlap in time (real concurrency). */
  const parallel = (sqls) => Promise.all(sqls.map(sql => new Promise((resolve, reject) => {
    const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'postgres', PGDATABASE: database }
    const child = spawn(join(bin, 'psql'), ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env })
    let out = ''
    let err = ''
    child.stdout.on('data', chunk => { out += chunk })
    child.stderr.on('data', chunk => { err += chunk })
    child.on('error', reject)
    child.on('close', code => (code === 0 ? resolve(out.trim()) : reject(new Error(`PSQL_SESSION_FAILED: ${err.trim()}`))))
  })))

  return {
    bin,
    port,
    database,
    dsn,
    psql,
    psqlFile,
    parallel,
    async stop() {
      run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop'])
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

/** Applies the versioned migration package through psql, in one transaction. */
export function migrationFiles(root) {
  const dir = join(root, 'hive/neon/migrations')
  return readdirSync(dir).filter(name => name.endsWith('.sql')).sort().map(name => join(dir, name))
}
