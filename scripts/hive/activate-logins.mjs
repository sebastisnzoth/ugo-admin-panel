#!/usr/bin/env node
// Activación SEGURA de los dos logins ya creados en Neon TEST.
//
// No crea roles ni repite migraciones: sólo pasa `hive_app` y `hive_console_ro` de NOLOGIN a
// LOGIN con contraseña nueva, fija sus límites y comprueba privilegios. Las contraseñas se
// generan aquí, se escriben en archivos con permisos 600 FUERA del repositorio y nunca se
// imprimen.
//
//   HIVE_MIGRATOR_DATABASE_URL='postgresql://…' node scripts/hive/activate-logins.mjs            # simulación
//   HIVE_MIGRATOR_DATABASE_URL='postgresql://…' HIVE_CONFIRM_ACTIVATION=APLICAR \
//     node scripts/hive/activate-logins.mjs --apply [--set-github-secrets] [--secret-dir ~/.ugo-hive/secrets]
//
// Salida: JSON con nombres de rol, límites y comprobaciones (sin credenciales).

import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { redact } from '../../hive/worker/config.mjs'
import { setGithubSecret } from './secret-setup.mjs'

const argv = process.argv.slice(2)
const flag = name => argv.includes(`--${name}`)
const value = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : fallback
}

const APPLY = flag('apply')
const CONFIRMED = process.env.HIVE_CONFIRM_ACTIVATION === 'APLICAR'
const ADMIN_URL = process.env.HIVE_MIGRATOR_DATABASE_URL || process.env.HIVE_ADMIN_DATABASE_URL || ''
const PSQL_BIN = process.env.PSQL_BIN || 'psql'
const secretDir = resolve(value('secret-dir', join(homedir(), '.ugo-hive', 'secrets')))

const ROLES = {
  worker: { role: 'hive_app', group: 'hive_worker', connections: 5, statementTimeout: '30s', secret: 'HIVE_WORKER_DATABASE_URL' },
  reader: { role: 'hive_console_ro', group: 'hive_reader', connections: 3, statementTimeout: '10s', secret: 'HIVE_READER_DATABASE_URL' },
}

const newPassword = () => randomBytes(32).toString('base64url')

/** Misma base/host que el rol de migraciones, con las credenciales nuevas. */
export function withCredentials(adminUrl, user, password) {
  const url = new URL(adminUrl)
  url.username = encodeURIComponent(user)
  url.password = encodeURIComponent(password)
  return url.toString()
}

function assertOutsideRepo(dir) {
  const repo = process.cwd()
  if (resolve(dir).startsWith(repo)) throw new Error('SECRET_DIR_INSIDE_REPO: usa un directorio fuera del repositorio')
}

const ACTIVATE_SQL = `
\\set ON_ERROR_STOP on
create or replace function pg_temp.require(p_ok boolean, p_message text) returns void
language plpgsql as $fn$ begin if not p_ok then raise exception 'REFUSED: %', p_message; end if; end $fn$;

select pg_temp.require(exists (select 1 from pg_roles where rolname = :'worker_role'), :'worker_role' || ' no existe: no se crea aquí');
select pg_temp.require(exists (select 1 from pg_roles where rolname = :'reader_role'), :'reader_role' || ' no existe: no se crea aquí');
select pg_temp.require(pg_has_role(:'worker_role', :'worker_group', 'member'), :'worker_role' || ' no es miembro de ' || :'worker_group');
select pg_temp.require(pg_has_role(:'reader_role', :'reader_group', 'member'), :'reader_role' || ' no es miembro de ' || :'reader_group');

alter role :"worker_role" login password :'worker_password' connection limit :worker_connections;
alter role :"worker_role" set statement_timeout = :'worker_timeout';
alter role :"worker_role" set idle_in_transaction_session_timeout = :'worker_timeout';
alter role :"worker_role" set lock_timeout = '5s';
alter role :"worker_role" set application_name = 'ugo-hive-worker';

alter role :"reader_role" login password :'reader_password' connection limit :reader_connections;
alter role :"reader_role" set statement_timeout = :'reader_timeout';
alter role :"reader_role" set idle_in_transaction_session_timeout = :'reader_timeout';
alter role :"reader_role" set lock_timeout = '3s';
alter role :"reader_role" set default_transaction_read_only = on;
alter role :"reader_role" set application_name = 'ugo-hive-console-ro';

select 'worker_login' as check, rolcanlogin as ok from pg_roles where rolname = :'worker_role'
union all select 'reader_login', rolcanlogin from pg_roles where rolname = :'reader_role'
union all select 'worker_not_superuser', not rolsuper from pg_roles where rolname = :'worker_role'
union all select 'reader_not_superuser', not rolsuper from pg_roles where rolname = :'reader_role'
union all select 'worker_no_ddl', not rolcreatedb and not rolcreaterole from pg_roles where rolname = :'worker_role'
union all select 'reader_no_ddl', not rolcreatedb and not rolcreaterole from pg_roles where rolname = :'reader_role'
union all select 'worker_conn_limit', (select rolconnlimit = :worker_connections from pg_roles where rolname = :'worker_role')
union all select 'reader_conn_limit', (select rolconnlimit = :reader_connections from pg_roles where rolname = :'reader_role')
union all select 'worker_cannot_insert', not has_table_privilege(:'worker_role', 'hive.jobs', 'INSERT')
union all select 'reader_cannot_insert', not has_table_privilege(:'reader_role', 'hive.jobs', 'INSERT')
union all select 'reader_cannot_reserve', not has_function_privilege(:'reader_role', 'hive.reserve_job(text,integer,text)', 'EXECUTE')
union all select 'worker_can_reserve', has_function_privilege(:'worker_role', 'hive.reserve_job(text,integer,text)', 'EXECUTE');
`

function psqlFile(client, sql, vars) {
  return client.run(sql, vars)
}

async function main() {
  if (!ADMIN_URL) {
    console.error(JSON.stringify({ ok: false, code: 'ADMIN_URL_REQUIRED', hint: 'exporta HIVE_MIGRATOR_DATABASE_URL (rol de migraciones)' }))
    process.exit(2)
  }
  if (APPLY && !CONFIRMED) {
    console.error(JSON.stringify({ ok: false, code: 'CONFIRMATION_REQUIRED', hint: 'exporta HIVE_CONFIRM_ACTIVATION=APLICAR' }))
    process.exit(2)
  }
  if (APPLY) assertOutsideRepo(secretDir)

  const admin = new PsqlClient({ databaseUrl: ADMIN_URL, bin: PSQL_BIN })
  const facts = admin.json(`select jsonb_build_object(
    'current_user', current_user,
    'can_manage_roles', (select rolcreaterole from pg_roles where rolname = current_user) or (select rolsuper from pg_roles where rolname = current_user),
    'worker_exists', exists(select 1 from pg_roles where rolname = 'hive_app'),
    'reader_exists', exists(select 1 from pg_roles where rolname = 'hive_console_ro'))::text;`)

  if (!facts.worker_exists || !facts.reader_exists) {
    console.error(JSON.stringify({ ok: false, code: 'ROLE_MISSING', facts, hint: 'este script no crea roles; primero deben existir' }))
    process.exit(3)
  }
  if (!facts.can_manage_roles) {
    console.error(JSON.stringify({ ok: false, code: 'MIGRATOR_CANNOT_MANAGE_ROLES', facts }))
    process.exit(3)
  }

  const passwords = { worker: newPassword(), reader: newPassword() }
  const report = {
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    admin_user: facts.current_user,
    roles: {
      worker: { role: ROLES.worker.role, group: ROLES.worker.group, connection_limit: ROLES.worker.connections, statement_timeout: ROLES.worker.statementTimeout },
      reader: { role: ROLES.reader.role, group: ROLES.reader.group, connection_limit: ROLES.reader.connections, statement_timeout: ROLES.reader.statementTimeout, read_only_transactions: true },
    },
    checks: {},
    secrets: {},
  }

  if (!APPLY) {
    report.checks = { roles_exist: true, can_manage_roles: true, would_activate: true }
    console.log(redact(JSON.stringify(report, null, 2)))
    console.log('Simulación: no se ha cambiado nada. Repite con --apply y HIVE_CONFIRM_ACTIVATION=APLICAR.')
    return
  }

  const output = psqlFile(admin, ACTIVATE_SQL, {
    worker_role: ROLES.worker.role, reader_role: ROLES.reader.role,
    worker_group: ROLES.worker.group, reader_group: ROLES.reader.group,
    worker_password: passwords.worker, reader_password: passwords.reader,
    worker_connections: String(ROLES.worker.connections), reader_connections: String(ROLES.reader.connections),
    worker_timeout: ROLES.worker.statementTimeout, reader_timeout: ROLES.reader.statementTimeout,
  })
  for (const line of output.split('\n')) {
    const [name, ok] = line.split('|').map(part => part.trim())
    if (name && (ok === 't' || ok === 'f')) report.checks[name] = ok === 't'
  }

  // Verificación real: conectar con cada login y comprobar identidad y límites.
  const workerClient = new PsqlClient({ databaseUrl: withCredentials(ADMIN_URL, ROLES.worker.role, passwords.worker), bin: PSQL_BIN })
  const readerClient = new PsqlClient({ databaseUrl: withCredentials(ADMIN_URL, ROLES.reader.role, passwords.reader), bin: PSQL_BIN })
  const workerFacts = workerClient.json(`select jsonb_build_object('current_user', current_user,
     'is_superuser', (select rolsuper from pg_roles where rolname = current_user),
     'worker_member', pg_has_role(current_user, 'hive_worker', 'member'))::text;`)
  const readerFacts = readerClient.json(`select jsonb_build_object('current_user', current_user,
     'read_only', current_setting('default_transaction_read_only')::boolean,
     'can_select', has_table_privilege('hive.jobs','SELECT'),
     'can_insert', has_table_privilege('hive.jobs','INSERT'))::text;`)
  report.connection_checks = { worker: workerFacts, reader: readerFacts }

  // Secretos: archivos 600 fuera del repositorio.
  mkdirSync(secretDir, { recursive: true, mode: 0o700 })
  const files = {}
  for (const [key, definition] of Object.entries(ROLES)) {
    const file = join(secretDir, `${definition.secret.toLowerCase().replace(/_/g, '-')}.url`)
    writeFileSync(file, `${withCredentials(ADMIN_URL, definition.role, passwords[key])}\n`, { mode: 0o600 })
    chmodSync(file, 0o600)
    files[definition.secret] = file
  }
  report.secrets = { directory: secretDir, files, github: {} }

  if (flag('set-github-secrets')) {
    for (const [key, definition] of Object.entries(ROLES)) {
      const url = withCredentials(ADMIN_URL, definition.role, passwords[key])
      report.secrets.github[definition.secret] = setGithubSecret(definition.secret, url)
    }
  } else {
    report.secrets.github = {
      note: 'no publicado: ejecuta con --set-github-secrets o usa secret-setup.mjs --set-github-secret',
      commands: Object.values(ROLES).map(definition => `${definition.secret}_FILE=<archivo> node scripts/hive/secret-setup.mjs --set-github-secret ${definition.secret}`),
    }
  }

  report.ok = Object.values(report.checks).every(Boolean)
    && workerFacts.worker_member === true && workerFacts.is_superuser === false
    && readerFacts.read_only === true && readerFacts.can_insert === false && readerFacts.can_select === true
  console.log(redact(JSON.stringify(report, null, 2)))
  process.exit(report.ok ? 0 : 5)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(JSON.stringify({ ok: false, code: 'ACTIVATION_FAILED', detail: redact(String(error?.message ?? error)).slice(0, 400) }))
    process.exit(1)
  })
}
