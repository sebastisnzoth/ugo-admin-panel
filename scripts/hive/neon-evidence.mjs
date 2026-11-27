// Regenerates docs/ugo-hive/evidence/hive-neon-package.json from a real run.
// Nothing in the evidence file is typed by hand: every number comes from a command.
import { spawnSync } from 'node:child_process'
import { writeFileSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { startPostgres, postgresAvailable, migrationFiles } from './pg-harness.mjs'

const ROOT = process.cwd()
const SUITES = ['tests/hive/neon-queue.test.mjs', 'tests/hive/neon-compat.test.mjs',
                'tests/hive/neon-real-schema.test.mjs', 'tests/hive/neon-concurrency.test.mjs']

function runSuite(file) {
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', file], {
    encoding: 'utf8',
    env: { ...process.env, HIVE_REQUIRE_REAL_POSTGRES: postgresAvailable() ? '1' : '0' },
    maxBuffer: 64 * 1024 * 1024,
  })
  const output = `${result.stdout}\n${result.stderr}`
  const num = pattern => Number((output.match(pattern) || [])[1] ?? -1)
  return {
    file,
    exit_code: result.status,
    tests: num(/^# tests (\d+)$/m),
    pass: num(/^# pass (\d+)$/m),
    fail: num(/^# fail (\d+)$/m),
    skipped: num(/^# skipped (\d+)$/m),
    names: [...output.matchAll(/^ok \d+ - (.+)$/gm)].map(match => match[1]),
  }
}

const suites = SUITES.map(runSuite)

let server = null
let database = null
if (postgresAvailable()) {
  server = await startPostgres()
  for (const file of migrationFiles(ROOT)) {
    const result = server.psqlFile(file, { vars: { 'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'hive', 'hive.confirm_first_apply': 'APLICAR' } })
    if (!result.ok) throw new Error(`MIGRATION_FAILED ${file}: ${result.stderr}`)
  }
  const q = sql => server.psql(sql)
  database = {
    server_version: q('select version()'),
    package_version: q(`select value from hive.meta where key='schema_version'`),
    destination_check: q(`select value from hive.meta where key='destination_check'`),
    destination_owner: q(`select value from hive.meta where key='destination_owner'`),
    server_encoding: q(`select value from hive.meta where key='server_encoding'`),
    fingerprint_prefix: q(`select left(value, 16) from hive.meta where key='destination_fingerprint'`),
    departments: Number(q('select count(*) from hive.departments')),
    agents_registered_in_catalog: Number(q('select count(*) from hive.agents')),
    agents_operative: Number(q(`select count(*) from hive.agents where state='OPERATIVE'`)),
    agents_disabled: Number(q(`select count(*) from hive.agents where state='DISABLED'`)),
    jobs_by_state: q(`select coalesce(string_agg(state || ':' || c, ', ' order by state), '(sin tareas)')
                       from (select state, count(*) c from hive.jobs group by state) s`),
    settings: Object.fromEntries(q(`select key || '=' || value::text from hive.settings order by key`).split('\n').map(line => line.split('='))),
    roles: q(`select string_agg(rolname, ', ' order by rolname) from pg_roles where rolname like 'hive\\_%'`),
    hive_functions: Number(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='hive'`)),
    arena_tables_inside_hive: Number(q(`select count(*) from information_schema.tables where table_schema='hive' and table_name in ('usuarios','autonomous_jobs','autonomous_agents','servicos','solicitudes')`)),
  }
  await server.stop()
}

const migrations = readdirSync(join(ROOT, 'hive/neon/migrations')).filter(f => f.endsWith('.sql')).sort()
const destructive = []
for (const file of migrations) {
  const sql = readFileSync(join(ROOT, 'hive/neon/migrations', file), 'utf8')
  const hit = sql.match(/drop\s+(table|schema)/gi)
  if (hit) destructive.push({ file, statements: hit })
}

const failed = suites.filter(suite => suite.exit_code !== 0 || suite.fail !== 0)
const evidence = {
  generated_at: new Date().toISOString(),
  generator: 'scripts/hive/neon-evidence.mjs',
  package: {
    version: database?.package_version ?? 'unknown',
    migrations,
    destructive_statements: destructive,
    non_destructive: destructive.length === 0,
  },
  database,
  suites,
  verdict: {
    suites_green: failed.length === 0,
    failed_suites: failed.map(suite => suite.file),
    operative_agents: database?.agents_operative ?? null,
    // Being registered is not being operational: 118 catalogued agents do not run.
    agents_operational: (database?.agents_operative ?? 0) > 0,
    departments_functional: false,
    note: 'Los 118 agentes están CATALOGADOS. Ninguno se declara operativo: no se ha ejecutado un job real contra ningún proveedor.',
  },
}

writeFileSync(join(ROOT, 'docs/ugo-hive/evidence/hive-neon-package.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ suites: suites.map(s => ({ file: s.file, pass: s.pass, fail: s.fail })), verdict: evidence.verdict }, null, 2))
process.exit(failed.length === 0 ? 0 : 1)
