import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const policyPath = process.argv[2] || 'docs/UGO_SCHEDULER_POLICY.json'
const locksDir = process.argv[3] || 'docs/ugo-work-locks'
const policy = JSON.parse(readFileSync(policyPath, 'utf8'))
const validStatuses = new Set(['QUEUED','IN_PROGRESS','WAITING_EVIDENCE','DONE','FAILED','ABANDONED'])
const errors = []

if (!Number.isInteger(policy.max_parallel_tasks) || policy.max_parallel_tasks < 1) errors.push('policy.max_parallel_tasks must be >= 1')
if (!Number.isInteger(policy.default_lease_minutes) || policy.default_lease_minutes < 5) errors.push('policy.default_lease_minutes must be >= 5')
if (!Array.isArray(policy.retry_backoff_minutes) || !policy.retry_backoff_minutes.length) errors.push('policy.retry_backoff_minutes required')

if (existsSync(locksDir)) {
  for (const name of readdirSync(locksDir)) {
    if (!name.endsWith('.json')) continue
    const path = join(locksDir, name)
    let lock
    try { lock = JSON.parse(readFileSync(path, 'utf8')) } catch (error) {
      errors.push(`${path}: invalid JSON: ${error.message}`)
      continue
    }
    for (const field of ['task_id','title','status','started_at','started_sha','owner','resources','correlation_id','attempt']) {
      if (lock[field] === undefined || lock[field] === null || lock[field] === '') errors.push(`${path}: missing ${field}`)
    }
    if (!validStatuses.has(lock.status)) errors.push(`${path}: invalid status ${lock.status}`)
    if (!Array.isArray(lock.resources) || !lock.resources.length) errors.push(`${path}: resources must be a non-empty array`)
    if (!Number.isInteger(lock.attempt) || lock.attempt < 1) errors.push(`${path}: attempt must be >= 1`)
    if (['QUEUED','IN_PROGRESS','WAITING_EVIDENCE'].includes(lock.status)) {
      if (!lock.heartbeat_at) errors.push(`${path}: active lock requires heartbeat_at`)
      if (!lock.lease_expires_at) errors.push(`${path}: active lock requires lease_expires_at`)
    }
    for (const field of ['started_at','heartbeat_at','lease_expires_at','finished_at','retry_after']) {
      if (lock[field] && Number.isNaN(Date.parse(lock[field]))) errors.push(`${path}: invalid ISO timestamp in ${field}`)
    }
    for (const resource of lock.resources || []) {
      if (!(resource in policy.resource_capacities)) errors.push(`${path}: unknown resource ${resource}`)
    }
  }
}

if (errors.length) {
  console.error('UGO scheduler validation FAILED')
  for (const error of errors) console.error('- ' + error)
  process.exit(1)
}
console.log('UGO scheduler validation PASS')
