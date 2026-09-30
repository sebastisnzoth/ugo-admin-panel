const ACTIVE = new Set(['QUEUED','IN_PROGRESS','WAITING_EVIDENCE'])

const ms = minutes => minutes * 60 * 1000
const iso = value => value ? Date.parse(value) : NaN

function latestByTask(locks) {
  const map = new Map()
  for (const lock of locks) {
    const previous = map.get(lock.task_id)
    const currentTime = iso(lock.started_at) || 0
    const previousTime = previous ? (iso(previous.started_at) || 0) : -1
    if (!previous || currentTime >= previousTime) map.set(lock.task_id, lock)
  }
  return map
}

function downstreamScores(tasks) {
  const children = new Map(tasks.map(t => [t.id, []]))
  for (const task of tasks) {
    for (const dep of task.depends_on || []) {
      if (children.has(dep)) children.get(dep).push(task.id)
    }
  }
  const memo = new Map()
  const visit = id => {
    if (memo.has(id)) return memo.get(id)
    const score = (children.get(id) || []).reduce((sum, child) => sum + 1 + visit(child), 0)
    memo.set(id, score)
    return score
  }
  for (const task of tasks) visit(task.id)
  return memo
}

export function scheduleTasks({tasks, locks, policy, now = new Date()}) {
  const nowMs = now.getTime()
  const latestLocks = latestByTask(locks)
  const completedIds = new Set(
    [...latestLocks.values()]
      .filter(lock => lock.status === 'DONE')
      .map(lock => lock.task_id)
  )
  const pendingIds = new Set(tasks.map(t => t.id).filter(id => !completedIds.has(id)))
  const scores = downstreamScores(tasks)
  const capacities = policy.resource_capacities || {}
  const resourceUsage = new Map()
  const activeLocks = []
  const staleLocks = []

  for (const lock of latestLocks.values()) {
    if (!ACTIVE.has(lock.status)) continue
    const leaseMs = iso(lock.lease_expires_at)
    const stale = Number.isFinite(leaseMs) && leaseMs <= nowMs
    if (stale) {
      staleLocks.push(lock)
      continue
    }
    activeLocks.push(lock)
    for (const resource of lock.resources || []) {
      resourceUsage.set(resource, (resourceUsage.get(resource) || 0) + 1)
    }
  }

  const activeTaskIds = new Set(activeLocks.map(l => l.task_id))
  const maxParallel = Number(policy.max_parallel_tasks || 1)
  let slots = Math.max(0, maxParallel - activeLocks.length)
  const candidates = []

  for (const task of tasks) {
    const taskPolicy = policy.task_policies?.[task.id] || {priority:'NORMAL',risk:'MEDIUM',human_gate:false}
    task.scheduler = {
      priority: taskPolicy.priority || 'NORMAL',
      priority_score: policy.priorities?.[taskPolicy.priority] ?? 50,
      risk: taskPolicy.risk || 'MEDIUM',
      human_gate: Boolean(taskPolicy.human_gate),
      critical_path_score: scores.get(task.id) || 0,
    }

    const ownLock = latestLocks.get(task.id)
    const unresolvedDeps = (task.depends_on || []).filter(id => pendingIds.has(id))
    task.blocked_by = []

    if (activeTaskIds.has(task.id)) {
      task.gate_state = 'IN_PROGRESS'
      task.gate_reason = 'Existe un lease activo para esta tarea.'
      task.active_lock = ownLock
      continue
    }

    if (staleLocks.some(lock => lock.task_id === task.id)) {
      task.gate_state = 'STALE_LOCK'
      task.gate_reason = 'El lease venció sin cierre. Requiere reconciliar el trabajo antes de reintentar.'
      task.active_lock = ownLock
      continue
    }

    if (unresolvedDeps.length) {
      task.gate_state = 'BLOCKED_DEPENDENCY'
      task.gate_reason = 'Debe completarse antes: ' + unresolvedDeps.join(', ')
      task.blocked_by = unresolvedDeps
      continue
    }

    if (ownLock?.status === 'FAILED') {
      const attempt = Number(ownLock.attempt || 1)
      if (attempt >= Number(policy.max_attempts || 1)) {
        task.gate_state = 'FAILED_REQUIRES_REVIEW'
        task.gate_reason = `Alcanzó el máximo de ${policy.max_attempts} intentos.`
        continue
      }
      const configuredBackoff = policy.retry_backoff_minutes || [5]
      const backoff = configuredBackoff[Math.min(attempt - 1, configuredBackoff.length - 1)]
      const base = iso(ownLock.finished_at) || iso(ownLock.heartbeat_at) || iso(ownLock.started_at) || nowMs
      const retryAt = ownLock.retry_after ? iso(ownLock.retry_after) : base + ms(backoff)
      task.retry_at = new Date(retryAt).toISOString()
      if (retryAt > nowMs) {
        task.gate_state = 'RETRY_BACKOFF'
        task.gate_reason = 'Reintento habilitado después de ' + task.retry_at
        continue
      }
    }

    if (task.scheduler.human_gate) {
      task.gate_state = 'HUMAN_REQUIRED'
      task.gate_reason = 'Este gate requiere una acción o aceptación humana verificable.'
      continue
    }

    const saturated = (task.resources || []).find(resource => {
      const capacity = Number(capacities[resource] ?? 1)
      return (resourceUsage.get(resource) || 0) >= capacity
    })
    if (saturated) {
      task.gate_state = 'WAITING_RESOURCE_CAPACITY'
      task.gate_reason = `Capacidad ocupada para recurso: ${saturated}`
      task.blocked_by = activeLocks.filter(l => (l.resources || []).includes(saturated)).map(l => l.task_id)
      continue
    }

    task.gate_state = 'READY'
    task.gate_reason = 'Dependencias satisfechas y recursos disponibles.'
    candidates.push(task)
  }

  const autonomousOutstanding = tasks.some(task =>
    task.scheduler?.human_gate === false &&
    !['DONE'].includes(task.gate_state)
  )
  if (policy.defer_human_gates_until_autonomous_exhausted && autonomousOutstanding) {
    for (const task of tasks) {
      if (task.gate_state !== 'HUMAN_REQUIRED') continue
      task.gate_state = 'HUMAN_DEFERRED'
      task.gate_reason = 'Prueba humana diferida hasta agotar el trabajo autónomo verificable.'
    }
  }

  candidates.sort((a,b) =>
    b.scheduler.priority_score - a.scheduler.priority_score ||
    b.scheduler.critical_path_score - a.scheduler.critical_path_score ||
    (a.order ?? 999) - (b.order ?? 999) ||
    a.id.localeCompare(b.id)
  )

  const selectedUsage = new Map(resourceUsage)
  const runnable = []
  for (const task of candidates) {
    if (slots <= 0) {
      task.gate_state = 'QUEUED_CAPACITY'
      task.gate_reason = `Límite global de ${maxParallel} trabajos concurrentes alcanzado.`
      continue
    }
    const saturated = (task.resources || []).find(resource => {
      const capacity = Number(capacities[resource] ?? 1)
      return (selectedUsage.get(resource) || 0) >= capacity
    })
    if (saturated) {
      task.gate_state = 'WAITING_RESOURCE_CAPACITY'
      task.gate_reason = `Otra tarea seleccionada usa la capacidad de: ${saturated}`
      continue
    }
    task.gate_state = 'AVAILABLE'
    task.gate_reason = 'Seleccionada por prioridad, camino crítico y capacidad disponible.'
    runnable.push(task)
    slots -= 1
    for (const resource of task.resources || []) selectedUsage.set(resource, (selectedUsage.get(resource) || 0) + 1)
  }

  return {
    tasks,
    runnable,
    activeLocks,
    staleLocks,
    summary: {
      policy_version: policy.version,
      max_parallel_tasks: maxParallel,
      active_leases: activeLocks.length,
      stale_leases: staleLocks.length,
      runnable_now: runnable.length,
      available_slots_after_plan: slots,
      ready_waiting_capacity: tasks.filter(t => ['QUEUED_CAPACITY','WAITING_RESOURCE_CAPACITY'].includes(t.gate_state)).length,
      blocked_dependency: tasks.filter(t => t.gate_state === 'BLOCKED_DEPENDENCY').length,
      human_required: tasks.filter(t => t.gate_state === 'HUMAN_REQUIRED').length,
      human_deferred: tasks.filter(t => t.gate_state === 'HUMAN_DEFERRED').length,
      retry_backoff: tasks.filter(t => t.gate_state === 'RETRY_BACKOFF').length,
      failed_review: tasks.filter(t => t.gate_state === 'FAILED_REQUIRES_REVIEW').length,
    }
  }
}
