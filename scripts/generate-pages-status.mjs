import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [sourcePath, outPath, sourceSha, publishedAt] = process.argv.slice(2)
if (!sourcePath || !outPath || !sourceSha || !publishedAt) {
  throw new Error('usage: node generate-pages-status.mjs <source> <out> <sha> <published-at>')
}

const source = readFileSync(sourcePath, 'utf8')
const evidenceUrl = 'https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/UGO_AUTONOMOUS_CORPORATION_IMPLEMENTATION.md'

const must = (re, label) => {
  const match = source.match(re)
  if (!match) throw new Error(`UGO Pages evidence missing: ${label}`)
  return match
}

const clean = value => value.replace(/`/g, '').replace(/\*\*/g, '').trim()

const coverageMatch = must(/Quality Coverage is now\s+(\d+)\/(\d+)/i, 'quality coverage')
const blockersMatch = must(
  /exactly three blockers:\s*`([^`]+)`,\s*`([^`]+)`,\s*and\s*`([^`]+)`/i,
  'final corporate audit blockers',
)
must(/META_AUDIT[^\n]*RED_TEAM[^\n]*DIGITAL_TWIN[^\n]*PASSED|PASSED[^\n]*META_AUDIT[^\n]*RED_TEAM[^\n]*DIGITAL_TWIN/i, 'D14 assurance pass set')
must(/CUSTOMER_1[^\n]*BLOCKED[^\n]*CUSTOMER_ACCEPTANCE_NOT_APPROVED/i, 'Customer #1 blocked evidence')

const remainingSection = must(
  /## 5\. Remaining Master work — blocking DONE([\s\S]*?)## 6\. DONE rule/i,
  'remaining Master work section',
)[1]

const implementationSteps = []
let phase = 'General'

for (const rawLine of remainingSection.split('\n')) {
  const line = rawLine.trim()
  if (line.startsWith('### ')) {
    phase = line.slice(4).trim()
    continue
  }
  if (!line.startsWith('- ')) continue
  if (phase === 'IP remaining controls') continue

  implementationSteps.push({
    id: `implementation-${implementationSteps.length + 1}`,
    phase,
    status: 'PENDING',
    owner: 'UGO',
    title: clean(line.slice(2)),
  })
}

if (/runtime UI validation remains/i.test(remainingSection)) {
  implementationSteps.push({
    id: `implementation-${implementationSteps.length + 1}`,
    phase: 'Super Admin',
    status: 'PENDING',
    owner: 'UGO',
    title: 'Runtime-validar la UI de Super Admin en el entorno aplicable.',
  })
}

if (/Execution remains intentionally blocked behind customer #1 core stability/i.test(remainingSection)) {
  implementationSteps.push({
    id: `implementation-${implementationSteps.length + 1}`,
    phase: 'UGO Empresas',
    status: 'WAITING_DEPENDENCY',
    owner: 'UGO',
    title: 'Habilitar y validar UGO Empresas después de la estabilidad de Customer #1.',
  })
}

function resolutionFor(title) {
  const t = title.toLowerCase()

  if (t.includes('browser-independent') || t.includes('scheduled test worker')) return {
    why: 'Falta demostrar que la autonomía funciona sin depender de una sesión de navegador abierta.',
    resolve: 'Ejecutar el worker programado en UGO TEST con autonomía ON, completar un job GREEN permitido, persistir Decision/Evidence Ledger y volver a estado seguro.',
    done_evidence: 'Workflow same-SHA GREEN + job SUCCEEDED + ledgers correlacionados + Sentinel PASS + autonomía segura al finalizar.',
    owner: 'UGO',
  }

  if (t.includes('openrouter')) return {
    why: 'La configuración no alcanza: falta demostrar primary, fallback y reevaluación en runtime.',
    resolve: 'Ejecutar la ruta protegida en TEST/Preview con primary gratuito y fallback real, persistiendo modelo, calidad, latencia, fallos y costo.',
    done_evidence: 'Primary y fallback ejecutados + telemetría persistida + costo dentro de política + evidencia del mismo SHA.',
    owner: 'UGO',
  }

  if (t.includes('bind qa simulators')) return {
    why: 'Los simuladores no pueden autocertificarse con booleans enviados por el caller.',
    resolve: 'Conectar Client/Provider/Admin simulados a acciones reales de UGO TEST y juzgar desde estado persistido independiente.',
    done_evidence: 'serviceId TEST + acciones autenticadas + judge independiente + QA run persistido + cobertura sólo tras PASS.',
    owner: 'UGO',
  }

  if (t.includes('chaos')) return {
    why: 'El Master exige probar fallos controlados, no sólo el camino feliz.',
    resolve: 'Inyectar fallos controlados en el P0 TEST y verificar contención, recuperación y ausencia de corrupción.',
    done_evidence: 'Chaos run persistido + detección + recuperación + regresión permanente.',
    owner: 'UGO',
  }

  if (t.includes('remediation')) return {
    why: 'Falta cerrar automáticamente detectar → corregir → reprobar.',
    resolve: 'Provocar un fallo conocido, generar remediation request, aplicar corrección segura, reejecutar y guardar regresión.',
    done_evidence: 'Fallo inicial + remediation + rerun PASS + regresión persistente ligada por correlation_id.',
    owner: 'UGO',
  }

  if (t.includes('release gate')) return {
    why: 'El gate debe demostrar que bloquea con evidencia incompleta y libera sólo cuando corresponde.',
    resolve: 'Reevaluar Release Gate con escenarios positivos y negativos en TEST y comprobar que los blockers salen del estado persistido actual.',
    done_evidence: 'Evaluación determinista persistida + caso bloqueado correcto + caso elegible correcto cuando todos los requisitos estén satisfechos.',
    owner: 'UGO',
  }

  if (t.includes('event binding')) return {
    why: 'Los eventos del servicio deben quedar unidos a la auditoría corporativa por el mismo serviceId/correlation_id.',
    resolve: 'Ejecutar un P0 en TEST y verificar que matching, llegada, evidencias, pago, cierre y auditoría se enlazan sin mezclar servicios.',
    done_evidence: 'Cadena completa de eventos y ledgers consultable para un único serviceId y mismo correlation_id.',
    owner: 'UGO',
  }

  if (t.includes('complete test journey')) return {
    why: 'Todavía se exige una ejecución completa de punta a punta en TEST por un único servicio.',
    resolve: 'Crear una solicitud TEST y completar matching → aceptación → viaje → llegada → evidencia inicial → trabajo → evidencia final → aprobación → pago → cierre → ratings.',
    done_evidence: 'Un serviceId con todos los estados y evidencias persistidos, sin edición manual de DB.',
    owner: 'UGO',
  }

  if (t.includes('recover without raw')) return {
    why: 'Una empresa autónoma no puede depender de editar Supabase/GitHub a mano para excepciones normales.',
    resolve: 'Ejecutar una excepción recuperable en TEST y resolverla mediante mecanismos de UGO, sin SQL manual ni cambios directos de estado.',
    done_evidence: 'Incidente persistido + acción de recuperación autorizada + verificación posterior + audit trail completo.',
    owner: 'UGO',
  }

  if (t.includes('d14 independent')) return {
    why: 'La auditoría debe ser independiente del ejecutor y cerrar hallazgos con re-auditoría.',
    resolve: 'Ejecutar D14 sobre el resultado actual, registrar findings, corregir los aplicables y volver a auditar con evidencia nueva.',
    done_evidence: 'Audit run independiente + findings + remediation + re-audit PASS o blockers externos explícitos.',
    owner: 'UGO',
  }

  if (t.includes('customer #1 launch gate')) return {
    why: 'El lanzamiento depende de evidencia real y no puede declararse READY desde un demo.',
    resolve: 'Reevaluar el gate después de completar el flujo humano real y las pruebas de dos dispositivos; no editar el resultado manualmente.',
    done_evidence: 'Customer #1 real aceptado + FULL-E2E aprobado + TWO-DEVICES aprobado + gate persistido READY.',
    owner: 'SERGIO + UGO',
  }

  if (t.includes('super admin')) return {
    why: 'La UI existe, pero todavía debe demostrarse que refleja y acciona el estado autoritativo en runtime.',
    resolve: 'Abrir Super Admin en TEST/Preview, recorrer autonomía, QA, Model Router, Risk/Audit, Launch Gate y timeline, y verificar cada lectura/acción contra backend.',
    done_evidence: 'Prueba runtime de UI + acciones autorizadas + estados concordantes con backend + evidencia del mismo SHA.',
    owner: 'UGO',
  }

  if (t.includes('ugo empresas')) return {
    why: 'Está deliberadamente detrás de la estabilidad del núcleo y Customer #1.',
    resolve: 'Primero cerrar Customer #1 y el núcleo; luego habilitar UGO Empresas y validar demanda/slots en TEST.',
    done_evidence: 'Customer #1 estable + UGO Empresas habilitado + operación TEST verificada.',
    owner: 'UGO',
  }

  return {
    why: 'Es un requisito explícito del Master que todavía no tiene evidencia suficiente para DONE.',
    resolve: 'Completar implementación, wiring, ejecución real en TEST, verificación determinista y evidencia persistida del mismo SHA.',
    done_evidence: 'Implementado + CI validado + runtime validado + regresión/evidencia persistente.',
    owner: 'UGO',
  }
}

const keyFor = title => {
  const t = title.toLowerCase()
  if (t.includes('browser-independent') || t.includes('scheduled test worker')) return 'worker-autonomy'
  if (t.includes('openrouter')) return 'model-router-runtime'
  if (t.includes('bind qa simulators')) return 'qa-simulator-binding'
  if (t.includes('chaos')) return 'chaos-p0'
  if (t.includes('remediation')) return 'remediation-regression'
  if (t.includes('release gate')) return 'release-gate'
  if (t.includes('event binding')) return 'audit-event-binding'
  if (t.includes('complete test journey')) return 'complete-test-journey'
  if (t.includes('recover without raw')) return 'exception-recovery'
  if (t.includes('d14 independent')) return 'd14-audit'
  if (t.includes('customer #1 launch gate')) return 'customer1-gate'
  if (t.includes('super admin')) return 'super-admin-ui'
  if (t.includes('ugo empresas')) return 'ugo-empresas'
  return 'task-' + title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,44)
}
const dependencyMap = {
  'worker-autonomy': [],
  'model-router-runtime': [],
  'qa-simulator-binding': [],
  'chaos-p0': ['qa-simulator-binding'],
  'remediation-regression': ['chaos-p0'],
  'release-gate': ['remediation-regression'],
  'audit-event-binding': ['qa-simulator-binding'],
  'complete-test-journey': ['audit-event-binding'],
  'exception-recovery': ['complete-test-journey'],
  'd14-audit': ['exception-recovery','release-gate'],
  'customer1-gate': ['d14-audit','complete-test-journey','release-gate'],
  'super-admin-ui': ['model-router-runtime'],
  'ugo-empresas': ['customer1-gate'],
}
const agentRegistry = {
  'ugo-maestro': { department: 'Dirección / Orquestación', agent: 'UGO Maestro', skills: ['planning','dependency-routing','job-control'] },
  'autonomy-worker': { department: 'Plataforma Autónoma', agent: 'Autonomy Worker', skills: ['scheduled-worker','job-execution','decision-ledger'] },
  'model-router': { department: 'IA / Plataforma', agent: 'Model Router', skills: ['model-routing','fallback','telemetry'] },
  'qa-engineer': { department: 'Calidad', agent: 'QA Engineer', skills: ['integration-testing','simulation','regression'] },
  'recovery-engineer': { department: 'Confiabilidad', agent: 'Recovery Engineer', skills: ['remediation','rollback','incident-recovery'] },
  'audit-agent': { department: 'Auditoría', agent: 'Audit Agent', skills: ['event-binding','ledger-audit','traceability'] },
  'journey-operator': { department: 'Operaciones', agent: 'Journey Operator', skills: ['p0-journey','matching','payments-ratings'] },
  'release-manager': { department: 'Release / Riesgo', agent: 'Release Manager', skills: ['release-gate','same-sha','launch-control'] },
  'frontend-operator': { department: 'Producto / Frontend', agent: 'Super Admin Operator', skills: ['runtime-ui','admin-actions','backend-consistency'] },
  'enterprise-operator': { department: 'UGO Empresas', agent: 'Enterprise Operator', skills: ['enterprise-ops','demand-slots','customer-readiness'] },
  'judge': { department: 'Control Independiente', agent: 'Judge', skills: ['independent-verification','acceptance-criteria'] },
  'sentinel': { department: 'Seguridad / Riesgo', agent: 'Sentinel', skills: ['safety-gate','invariants','fail-closed'] },
}
const assignmentMap = {
  'worker-autonomy': ['autonomy-worker'],
  'model-router-runtime': ['model-router'],
  'qa-simulator-binding': ['qa-engineer'],
  'chaos-p0': ['qa-engineer'],
  'remediation-regression': ['recovery-engineer'],
  'release-gate': ['release-manager'],
  'audit-event-binding': ['audit-agent'],
  'complete-test-journey': ['journey-operator'],
  'exception-recovery': ['recovery-engineer'],
  'd14-audit': ['audit-agent'],
  'customer1-gate': ['release-manager'],
  'super-admin-ui': ['frontend-operator'],
  'ugo-empresas': ['enterprise-operator'],
}
const assignJob = step => {
  const key = (assignmentMap[step.id] || ['ugo-maestro'])[0]
  const profile = agentRegistry[key] || agentRegistry['ugo-maestro']
  step.job_id = 'UGO-' + step.id.toUpperCase()
  step.department = profile.department
  step.assigned_agent = profile.agent
  step.skills = profile.skills
  step.validators = ['Judge','Sentinel']
  return step
}

const resourceMap = {
  'worker-autonomy': ['ugo-test-worker','autonomy-state','shared-provider-fixture'],
  'model-router-runtime': ['model-router','openrouter','preview-runtime'],
  'qa-simulator-binding': ['qa-simulators','shared-provider-fixture','ugo-test-p0'],
  'chaos-p0': ['ugo-test-p0','shared-provider-fixture','qa-lab'],
  'remediation-regression': ['qa-lab','regression'],
  'release-gate': ['launch-gate','qa-lab'],
  'audit-event-binding': ['ugo-test-p0','audit-ledger','shared-provider-fixture'],
  'complete-test-journey': ['ugo-test-p0','shared-provider-fixture','payments','ratings'],
  'exception-recovery': ['ugo-test-p0','recovery','shared-provider-fixture'],
  'd14-audit': ['d14-audit','audit-ledger'],
  'customer1-gate': ['launch-gate','customer1'],
  'super-admin-ui': ['super-admin-ui','preview-runtime'],
  'ugo-empresas': ['ugo-empresas'],
}
for (const [index, step] of implementationSteps.entries()) {
  Object.assign(step, resolutionFor(step.title))
  step.id = keyFor(step.title)
  step.order = index + 1
  step.depends_on = dependencyMap[step.id] || []
  step.resources = resourceMap[step.id] || [step.id]
  step.evidence_url = evidenceUrl
  assignJob(step)
}

const blockerDetails = {
  FOUNDER_CHALLENGE_PENDING: {
    title: 'Founder Challenge',
    why: 'El Master lo reserva a intervención humana y actualmente figura PLANNED.',
    resolve: 'Sergio revisa el desafío del fundador y registra la decisión/aceptación; UGO persiste el resultado y reevalúa el audit final.',
    done_evidence: 'Founder Challenge completado con decisión humana auditable + re-auditoría posterior.',
    owner: 'SERGIO + UGO',
  },
  PHYSICAL_GPS_DEVICE_UNVERIFIED: {
    title: 'GPS físico real',
    why: 'Una simulación no demuestra permisos, frescura GPS, geofence ni hardware real.',
    resolve: 'Ejecutar Cliente/Proveedor en dispositivos físicos, obtener GPS reciente válido, rechazar 0,0/fake/stale y confirmar llegada dentro del geofence.',
    done_evidence: 'Evidencia física vinculada a un serviceId + timestamps + geofence PASS + audit trail persistido.',
    owner: 'SERGIO + UGO',
  },
  REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED: {
    title: 'Customer #1 real',
    why: 'El objetivo final exige aceptación humana real; un demo o fixture no puede reemplazarla.',
    resolve: 'Completar el viaje real con Cliente y Proveedor en dos dispositivos, aprobar FULL-E2E/TWO-DEVICES y registrar aceptación.',
    done_evidence: 'Servicio real completo + aceptación humana + FULL-E2E aprobado + TWO-DEVICES aprobado + Launch Gate reevaluado.',
    owner: 'SERGIO + UGO',
  },
}

const finalGateSteps = blockersMatch.slice(1, 4).map((code, index) => ({
  id: code === 'FOUNDER_CHALLENGE_PENDING' ? 'founder-challenge' : code === 'PHYSICAL_GPS_DEVICE_UNVERIFIED' ? 'physical-gps' : code === 'REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED' ? 'real-customer-acceptance' : `final-gate-${index + 1}`,
  phase: 'Final Gate',
  status: 'BLOCKED',
  code,
  evidence_url: evidenceUrl,
  depends_on: code === 'FOUNDER_CHALLENGE_PENDING' ? ['d14-audit'] : code === 'PHYSICAL_GPS_DEVICE_UNVERIFIED' ? ['complete-test-journey'] : code === 'REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED' ? ['customer1-gate','physical-gps'] : [],
  resources: code === 'FOUNDER_CHALLENGE_PENDING' ? ['founder-challenge'] : code === 'PHYSICAL_GPS_DEVICE_UNVERIFIED' ? ['physical-gps','customer1-device-test'] : code === 'REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED' ? ['customer1','customer1-device-test'] : ['final-audit'],
  ...(blockerDetails[code] || {
    title: code,
    why: 'Bloqueo persistido del audit final.',
    resolve: 'Resolver la condición y reejecutar la auditoría.',
    done_evidence: 'Audit final sin este blocker.',
    owner: 'UGO',
  }),
}))

for (const step of finalGateSteps) assignJob(step)

const allWork = [...implementationSteps, ...finalGateSteps]
const activeLocks = []
const workLocksDir = 'docs/ugo-work-locks'
if (existsSync(workLocksDir)) {
  for (const name of readdirSync(workLocksDir)) {
    if (!name.endsWith('.json')) continue
    try {
      const lock = JSON.parse(readFileSync(join(workLocksDir, name), 'utf8'))
      if (['IN_PROGRESS','QUEUED','WAITING_EVIDENCE'].includes(lock.status)) activeLocks.push(lock)
    } catch {}
  }
}
const pendingIds = new Set(allWork.map(x => x.id))
const intersects = (a=[], b=[]) => a.some(x => b.includes(x))
for (const step of allWork) {
  const unresolvedDeps = (step.depends_on || []).filter(id => pendingIds.has(id))
  const ownLock = activeLocks.find(lock => lock.task_id === step.id)
  const conflict = activeLocks.find(lock => lock.task_id !== step.id && intersects(step.resources || [], lock.resources || []))
  if (ownLock) {
    step.gate_state = 'IN_PROGRESS'
    step.gate_reason = 'Trabajo activo persistido en el repo.'
    step.active_lock = ownLock
  } else if (unresolvedDeps.length) {
    step.gate_state = 'BLOCKED_DEPENDENCY'
    step.gate_reason = 'Debe completarse antes: ' + unresolvedDeps.join(', ')
    step.blocked_by = unresolvedDeps
  } else if (conflict) {
    step.gate_state = 'WAITING_CONFLICT'
    step.gate_reason = 'Recurso compartido en uso por ' + conflict.task_id
    step.blocked_by = [conflict.task_id]
  } else {
    step.gate_state = 'AVAILABLE'
    step.gate_reason = 'Puede ejecutarse ahora sin dependencias pendientes ni conflicto de recursos.'
  }
}
const runnable = allWork.filter(x => x.gate_state === 'AVAILABLE')

const status = {
  title: 'UGO Implementation Command Center',
  source: sourcePath,
  source_sha: sourceSha,
  published_at_utc: publishedAt,
  evidence_url: evidenceUrl,
  environment: 'UGO TEST / GitHub Pages',
  production: 'PROTECTED',
  production_ready: false,
  state: 'IN_PROGRESS',
  objective: 'UGO Launch Ready — Florianópolis',
  objective_path: 'Cliente → solicitud → matching ≤20 km → aceptación → GPS/viaje → llegada → evidencias → trabajo → aprobación → pago → cierre → ratings → auditoría',
  quality_coverage: {
    covered: Number(coverageMatch[1]),
    total: Number(coverageMatch[2]),
  },
  assurance: [
    { name: 'META_AUDIT', status: 'PASSED' },
    { name: 'RED_TEAM', status: 'PASSED' },
    { name: 'DIGITAL_TWIN', status: 'PASSED' },
  ],
  corporate_final_audit: {
    status: 'BLOCKED',
    blockers: blockersMatch.slice(1, 4),
  },
  customer_1: 'BLOCKED',
  customer_1_reason: 'CUSTOMER_ACCEPTANCE_NOT_APPROVED',
  implementation_steps: implementationSteps,
  final_gate_steps: finalGateSteps,
  organization: {
    orchestrator: agentRegistry['ugo-maestro'],
    validators: [agentRegistry.judge, agentRegistry.sentinel],
    agents: Object.values(agentRegistry),
    operating_model: 'ORCHESTRATOR → ASSIGNED JOB → SPECIALIST → QA/EVIDENCE → JUDGE → SENTINEL → DONE',
  },
  active_locks: activeLocks,
  runnable_steps: runnable.map(x => x.id),
  counts: {
    implementation_pending: implementationSteps.length,
    final_gate_blockers: finalGateSteps.length,
    total_visible_work_items: allWork.length,
    human_involved: allWork.filter(x => x.owner.includes('SERGIO')).length,
    runnable_now: runnable.length,
    in_progress: allWork.filter(x => x.gate_state === 'IN_PROGRESS').length,
    blocked_dependency: allWork.filter(x => x.gate_state === 'BLOCKED_DEPENDENCY').length,
    waiting_conflict: allWork.filter(x => x.gate_state === 'WAITING_CONFLICT').length,
  },
  next_movement: runnable[0] || allWork.find(x => x.gate_state === 'IN_PROGRESS') || allWork[0] || null,
  refresh_policy: {
    mode: 'EVENT_PLUS_SCHEDULE',
    minutes: 5,
  },
  needs_sergio_now: allWork.some(x => x.owner.includes('SERGIO')),
}

writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n')
console.log(`UGO Pages command center · implementation pending ${status.counts.implementation_pending} · final blockers ${status.counts.final_gate_blockers}`)
