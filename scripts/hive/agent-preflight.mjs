#!/usr/bin/env node
// Preflight del agente ANTES de encolar trabajo: comprobar, contra la base real, que el
// agente existe en el catálogo, su estado y su departamento. Sin esto, "un solo agente"
// podría significar "un agente inventado".
//
//   HIVE_WORKER_DATABASE_URL=… node scripts/hive/agent-preflight.mjs --agent hugo-orchestrator
//   HIVE_WORKER_DATABASE_URL=… node scripts/hive/agent-preflight.mjs --list --department 2
//
// Salida: JSON sin secretos. Código de salida 3 si el agente no existe o no es OPERATIVE
// (salvo que se pida --list, que sólo informa).

import { PsqlClient } from '../../hive/worker/db.mjs'
import { loadConfig } from '../../hive/worker/config.mjs'

const argv = process.argv.slice(2)
const flag = name => argv.includes(`--${name}`)
const value = name => {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : undefined
}

const config = loadConfig(process.env, [])
const databaseUrl = config.databaseUrl
if (!databaseUrl) {
  console.error(JSON.stringify({ ok: false, code: 'DATABASE_URL_REQUIRED', hint: 'exporta HIVE_WORKER_DATABASE_URL' }))
  process.exit(2)
}

const client = new PsqlClient({ databaseUrl, bin: process.env.PSQL_BIN || 'psql' })
const agent = value('agent') ?? config.agent
const department = value('department')

const census = client.json('select hive.agent_census()::text')

if (flag('list') || !agent) {
  const rows = client.json(`select coalesce(jsonb_agg(jsonb_build_object(
      'agent_key', a.agent_key, 'name', a.name, 'state', a.state,
      'department_id', a.department_id, 'department', d.name) order by a.department_id, a.agent_key), '[]'::jsonb)::text
    from hive.agents a left join hive.departments d on d.id = a.department_id
    where (:dep::int is null or a.department_id = :dep::int)`,
    { dep: department ?? null })
  console.log(JSON.stringify({ ok: true, mode: 'list', census, agents: rows }, null, 2))
  process.exit(0)
}

const row = client.json(`select to_jsonb(a)::text from (
    select a.agent_key, a.name, a.state, a.department_id, d.name as department, a.legacy_status
      from hive.agents a left join hive.departments d on d.id = a.department_id
     where a.agent_key = :'agent' or a.name = :'agent') a`, { agent })
const activeOperative = Number(census.operative ?? 0)
const report = {
  ok: Boolean(row) && row.state === 'OPERATIVE',
  requested: agent,
  found: Boolean(row),
  agent: row ? { agent_key: row.agent_key, name: row.name, state: row.state, department: row.department } : null,
  census,
  limits: { max_operative_agents: census.max_operative_agents, operative_now: activeOperative },
}
if (!row) report.code = 'AGENT_NOT_REGISTERED'
else if (row.state !== 'OPERATIVE') report.code = 'AGENT_NOT_OPERATIVE'
console.log(JSON.stringify(report, null, 2))
process.exit(report.ok ? 0 : 3)
