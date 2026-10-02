const ACTIVE_LOCK_STATUSES = new Set(['QUEUED','IN_PROGRESS','WAITING_EVIDENCE'])
const HUMAN_LOCK_STATUSES = new Set(['HUMAN_REQUIRED'])
const PRIORITY_SCORE = {CRITICAL:100,HIGH:80,NORMAL:50,LOW:20,FINAL:0}

const parseTime = value => {
  const n = Date.parse(value || '')
  return Number.isFinite(n) ? n : null
}

const readinessIdFromLock = lock => {
  if (lock?.readiness_id) return lock.readiness_id
  const task = String(lock?.task_id || '')
  if (task.startsWith('readiness-')) return task.slice('readiness-'.length)
  return null
}

const latestReadinessLocks = locks => {
  const map = new Map()
  for (const lock of locks || []) {
    const readinessId = readinessIdFromLock(lock)
    if (!readinessId) continue
    const previous = map.get(readinessId)
    const currentTime = parseTime(lock.started_at) || 0
    const previousTime = previous ? (parseTime(previous.started_at) || 0) : -1
    if (!previous || currentTime >= previousTime) map.set(readinessId, lock)
  }
  return map
}

const validatorPass = lock => {
  const result = lock?.validators_result || lock?.validation || {}
  const judge = result.Judge || result.judge
  const sentinel = result.Sentinel || result.sentinel
  const evidence = (Array.isArray(lock?.evidence_ids) && lock.evidence_ids.length > 0)
    || Boolean(lock?.evidence_path && lock?.evidence_commit_sha)
  return lock?.status === 'DONE' && judge === 'PASS' && sentinel === 'PASS' && evidence
}

export function evaluateFunctionalReadiness({
  functionalReadiness,
  locks = [],
  pullRequests = [],
  maxParallel = 5,
  maxAttempts = 3,
  retryBackoffMinutes = [5, 15, 30],
  now = new Date(),
}) {
  const readiness = structuredClone(functionalReadiness)
  const items = readiness.groups.flatMap(group =>
    group.items.map(item => ({...item, group_id:group.id, group_title:group.title}))
  )
  const byId = new Map(items.map(item => [item.id,item]))
  const lockById = latestReadinessLocks(locks)
  const readinessPrById = new Map()
  for (const pr of pullRequests || []) {
    const readinessId = pr.readiness_id || null
    if (!readinessId || !byId.has(readinessId)) continue
    const previous = readinessPrById.get(readinessId)
    const currentTime = parseTime(pr.updated_at) || 0
    const previousTime = previous ? (parseTime(previous.updated_at) || 0) : -1
    if (!previous || currentTime >= previousTime) readinessPrById.set(readinessId, pr)
  }
  const nowMs = now.getTime()

  for (const item of items) {
    const lock = lockById.get(item.id) || null
    item.lock = lock
    item.declared_status = item.status

    if (validatorPass(lock)) {
      item.status = 'VERIFIED'
      item.evidence_source = 'READINESS_LOCK'
      continue
    }

    if (lock && HUMAN_LOCK_STATUSES.has(lock.status)) {
      item.status = 'HUMAN_REQUIRED'
      item.human_runtime_evidence = lock.human_runtime_evidence || null
      item.evidence_source = 'READINESS_LOCK'
      continue
    }

    if (lock?.status === 'WAITING_EVIDENCE' && lock?.human_final_required?.required === true) {
      item.status = 'HUMAN_REQUIRED'
      item.human_runtime_evidence = lock.human_runtime_evidence || null
      item.evidence_source = 'READINESS_LOCK'
      continue
    }

    if (lock && ACTIVE_LOCK_STATUSES.has(lock.status)) {
      const leaseMs = parseTime(lock.lease_expires_at)
      if (leaseMs !== null && leaseMs <= nowMs) {
        item.status = 'STALE_LOCK'
      } else {
        item.status = 'IN_PROGRESS'
      }
      item.evidence_source = 'READINESS_LOCK'
      continue
    }

    if (lock?.status === 'FAILED') {
      const attempt = Number(lock.attempt || 1)
      if (attempt >= Number(maxAttempts || 1)) {
        item.status = 'FAILED_REQUIRES_REVIEW'
        item.evidence_source = 'READINESS_LOCK'
        continue
      }
      const configuredBackoff = Array.isArray(retryBackoffMinutes) && retryBackoffMinutes.length
        ? retryBackoffMinutes
        : [5]
      const backoff = configuredBackoff[Math.min(attempt - 1, configuredBackoff.length - 1)]
      const base = parseTime(lock.finished_at) ?? parseTime(lock.heartbeat_at) ?? parseTime(lock.started_at) ?? nowMs
      const retryAt = lock.retry_after ? parseTime(lock.retry_after) : base + Number(backoff || 0) * 60 * 1000
      item.retry_at = new Date(retryAt).toISOString()
      item.evidence_source = 'READINESS_LOCK'
      if (retryAt > nowMs) {
        item.status = 'RETRY_BACKOFF'
        continue
      }
      item.status = item.declared_status
    }

    const pr = readinessPrById.get(item.id) || null
    if (pr) {
      item.pull_request = pr
      item.evidence_source = 'OPEN_PULL_REQUEST'
      const finalStatus = String(pr.evidence_status || '').toUpperCase()
      const runtimeStatus = String(pr.runtime_status || '').toUpperCase()
      const judge = String(pr.judge || '').toUpperCase()
      const sentinel = String(pr.sentinel || '').toUpperCase()

      if (runtimeStatus === 'NOT_AVAILABLE' || finalStatus === 'NEEDS_RUNTIME_PROOF') {
        item.status = 'WAITING_RUNTIME'
      } else if (judge && judge !== 'PASS') {
        item.status = 'JUDGE_PENDING'
      } else if (sentinel && sentinel !== 'PASS') {
        item.status = 'SENTINEL_PENDING'
      } else {
        item.status = 'FIXED_IN_PR'
      }
    }
  }

  let dependencyIntegrityChanged = true
  while (dependencyIntegrityChanged) {
    dependencyIntegrityChanged = false
    for (const item of items) {
      if (item.status !== 'VERIFIED' || item.evidence_source !== 'READINESS_LOCK') continue
      const unresolved = (item.depends_on || []).filter(id => byId.get(id)?.status !== 'VERIFIED')
      if (!unresolved.length) continue
      item.status = item.declared_status === 'HUMAN_FINAL' ? 'HUMAN_REQUIRED' : 'NEEDS_RUNTIME_PROOF'
      item.evidence_source = 'READINESS_LOCK_BLOCKED_BY_DEPENDENCY'
      item.blocked_verified_lock = true
      item.blocked_verified_dependencies = unresolved
      dependencyIntegrityChanged = true
    }
  }

  const dependencySatisfied = id => byId.get(id)?.status === 'VERIFIED'

  const humanBlockedMemo = new Map()
  const dependsOnHumanFinal = (id, visiting = new Set()) => {
    if (humanBlockedMemo.has(id)) return humanBlockedMemo.get(id)
    if (visiting.has(id)) return false
    const item = byId.get(id)
    if (!item) return false
    if (item.status === 'HUMAN_REQUIRED' || item.declared_status === 'HUMAN_FINAL') {
      humanBlockedMemo.set(id, true)
      return true
    }
    const next = new Set(visiting)
    next.add(id)
    const blocked = (item.depends_on || []).some(dep => dependsOnHumanFinal(dep, next))
    humanBlockedMemo.set(id, blocked)
    return blocked
  }
  const active = items.filter(item => item.status === 'IN_PROGRESS')
  const globalActiveLocks = (locks || []).filter(lock => {
    if (!ACTIVE_LOCK_STATUSES.has(lock.status)) return false
    const leaseMs = parseTime(lock.lease_expires_at)
    return leaseMs === null || leaseMs > nowMs
  })
  const usedResources = new Set([
    ...active.flatMap(item => item.resources || []),
    ...globalActiveLocks.flatMap(lock => lock.resources || []),
  ])
  const slots = Math.max(0, Number(maxParallel || 5) - globalActiveLocks.length)

  const candidates = items
    .filter(item => item.status === 'NEEDS_RUNTIME_PROOF')
    .map(item => ({
      ...item,
      unresolved_dependencies:(item.depends_on || []).filter(id => !dependencySatisfied(id)),
    }))
    .filter(item => item.unresolved_dependencies.length === 0)
    .sort((a,b) =>
      (PRIORITY_SCORE[b.priority] || 0) - (PRIORITY_SCORE[a.priority] || 0)
      || a.id.localeCompare(b.id)
    )

  const selected = []
  const selectedResources = new Set(usedResources)
  let remainingSlots = slots

  for (const item of candidates) {
    if (remainingSlots <= 0) break
    const conflict = (item.resources || []).some(resource => selectedResources.has(resource))
    if (conflict) continue
    selected.push(item.id)
    for (const resource of item.resources || []) selectedResources.add(resource)
    remainingSlots -= 1
  }

  const remainingAutonomousBeforeHuman = items.filter(
    item => item.status !== 'VERIFIED'
      && item.status !== 'HUMAN_REQUIRED'
      && item.declared_status !== 'HUMAN_FINAL'
      && !dependsOnHumanFinal(item.id)
  ).length

  for (const item of items) {
    const unresolved = (item.depends_on || []).filter(id => !dependencySatisfied(id))
    item.unresolved_dependencies = unresolved

    if (item.status === 'VERIFIED') {
      item.gate_state = 'VERIFIED'
      item.gate_reason = 'Judge + Sentinel PASS con evidencia persistida.'
    } else if (item.status === 'STALE_LOCK') {
      item.gate_state = 'STALE_LOCK'
      item.gate_reason = 'El lease del control venció y debe reconciliarse antes de reintentar.'
    } else if (item.status === 'FAILED_REQUIRES_REVIEW') {
      item.gate_state = 'FAILED_REQUIRES_REVIEW'
      item.gate_reason = 'La última ejecución agotó los intentos automáticos y requiere revisión.'
    } else if (item.status === 'RETRY_BACKOFF') {
      item.gate_state = 'RETRY_BACKOFF'
      item.gate_reason = 'Reintento habilitado después de ' + item.retry_at
    } else if (item.status === 'WAITING_RUNTIME') {
      item.gate_state = 'WAITING_RUNTIME'
      item.gate_reason = 'Corrección persistida en PR #' + item.pull_request.number + '; falta runtime same-SHA antes de Judge/Sentinel.'
    } else if (item.status === 'JUDGE_PENDING') {
      item.gate_state = 'JUDGE_PENDING'
      item.gate_reason = 'PR #' + item.pull_request.number + ' tiene evidencia runtime; falta Judge PASS.'
    } else if (item.status === 'SENTINEL_PENDING') {
      item.gate_state = 'SENTINEL_PENDING'
      item.gate_reason = 'PR #' + item.pull_request.number + ' pasó Judge; falta Sentinel PASS.'
    } else if (item.status === 'FIXED_IN_PR') {
      item.gate_state = 'FIXED_IN_PR'
      item.gate_reason = 'Existe corrección abierta en PR #' + item.pull_request.number + '; falta completar el cierre autoritativo.'
    } else if (item.status === 'IN_PROGRESS') {
      item.gate_state = 'IN_PROGRESS'
      item.gate_reason = 'Existe un lock persistido activo para este control.'
    } else if (item.status === 'HUMAN_REQUIRED') {
      item.gate_state = 'HUMAN_REQUIRED'
      const humanResult = String(item.human_runtime_evidence?.result || '').toUpperCase()
      const humanSymptom = String(item.human_runtime_evidence?.symptom || '').trim()
      item.gate_reason = humanResult === 'FAIL'
        ? 'La prueba humana real FALLÓ' + (humanSymptom ? ': ' + humanSymptom : '') + '. No está VERIFIED; requiere corrección y nueva prueba física.'
        : 'La automatización verificable quedó agotada; falta evidencia humana/física real.'
    } else if (item.declared_status === 'HUMAN_FINAL') {
      if (remainingAutonomousBeforeHuman > 0) {
        item.gate_state = 'HUMAN_DEFERRED'
        item.gate_reason = 'Prueba humana/física diferida hasta completar todo el trabajo autónomo verificable.'
      } else {
        item.gate_state = 'HUMAN_REQUIRED'
        item.gate_reason = 'Todo el trabajo autónomo verificable está cerrado; este paso requiere evidencia humana/física real.'
      }
    } else if (unresolved.length) {
      item.gate_state = 'BLOCKED_DEPENDENCY'
      item.gate_reason = 'Debe completarse antes: ' + unresolved.join(', ')
    } else if (selected.includes(item.id)) {
      item.gate_state = 'AVAILABLE'
      item.gate_reason = 'Dependencias satisfechas, prioridad aplicable y recursos libres.'
    } else if ((item.resources || []).some(resource => selectedResources.has(resource))) {
      item.gate_state = 'WAITING_RESOURCE_CAPACITY'
      item.gate_reason = 'Recurso compartido reservado por otro control habilitado o activo.'
    } else {
      item.gate_state = 'QUEUED_CAPACITY'
      item.gate_reason = 'Espera un slot del máximo global de ' + maxParallel + ' trabajos paralelos.'
    }
  }

  for (const group of readiness.groups) {
    group.items = group.items.map(original => {
      const evaluated = byId.get(original.id)
      return evaluated ? {...evaluated} : original
    })
  }

  const summary = {
    total:items.length,
    verified:items.filter(x => x.status === 'VERIFIED').length,
    remaining_total:items.filter(x => x.status !== 'VERIFIED').length,
    remaining_autonomous:items.filter(x => x.status !== 'VERIFIED' && x.status !== 'HUMAN_REQUIRED' && x.declared_status !== 'HUMAN_FINAL' && !dependsOnHumanFinal(x.id)).length,
    human_final:items.filter(x => x.declared_status === 'HUMAN_FINAL' && x.status !== 'VERIFIED').length,
    available_now:items.filter(x => x.gate_state === 'AVAILABLE').length,
    in_progress:items.filter(x => x.gate_state === 'IN_PROGRESS').length,
    blocked_dependency:items.filter(x => x.gate_state === 'BLOCKED_DEPENDENCY').length,
    waiting_resource:items.filter(x => x.gate_state === 'WAITING_RESOURCE_CAPACITY').length,
    queued_capacity:items.filter(x => x.gate_state === 'QUEUED_CAPACITY').length,
    stale_locks:items.filter(x => x.gate_state === 'STALE_LOCK').length,
    failed_review:items.filter(x => x.gate_state === 'FAILED_REQUIRES_REVIEW').length,
    retry_backoff:items.filter(x => x.gate_state === 'RETRY_BACKOFF').length,
    fixed_in_pr:items.filter(x => x.gate_state === 'FIXED_IN_PR').length,
    waiting_runtime:items.filter(x => x.gate_state === 'WAITING_RUNTIME').length,
    judge_pending:items.filter(x => x.gate_state === 'JUDGE_PENDING').length,
    sentinel_pending:items.filter(x => x.gate_state === 'SENTINEL_PENDING').length,
    human_deferred:items.filter(x => x.gate_state === 'HUMAN_DEFERRED').length,
    human_required:items.filter(x => x.gate_state === 'HUMAN_REQUIRED').length,
    runnable_ids:items.filter(x => x.gate_state === 'AVAILABLE').map(x => x.id),
    groups:readiness.groups.map(group => ({
      id:group.id,
      title:group.title,
      total:group.items.length,
      verified:group.items.filter(x => x.status === 'VERIFIED').length,
      remaining:group.items.filter(x => x.status !== 'VERIFIED').length,
      available_now:group.items.filter(x => x.gate_state === 'AVAILABLE').length,
    })),
  }

  return {readiness, summary}
}
