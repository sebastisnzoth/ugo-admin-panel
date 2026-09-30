import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scheduleTasks } from './ugo-scheduler-engine.mjs'
import { evaluateFunctionalReadiness } from './ugo-readiness-engine.mjs'

const [sourcePath, outPath, sourceSha, publishedAt, pullRequestsPath] = process.argv.slice(2)
if (!sourcePath || !outPath || !sourceSha || !publishedAt) {
  throw new Error('usage: node generate-pages-status.mjs <source> <out> <sha> <published-at> [pull-requests-json]')
}

const source = readFileSync(sourcePath, 'utf8')
const evidenceUrl = 'https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/UGO_AUTONOMOUS_CORPORATION_IMPLEMENTATION.md'
const schedulerPolicy = JSON.parse(readFileSync('docs/UGO_SCHEDULER_POLICY.json','utf8'))
const functionalReadinessSource = JSON.parse(readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const pullRequests = pullRequestsPath && existsSync(pullRequestsPath)
  ? (JSON.parse(readFileSync(pullRequestsPath,'utf8')).pull_requests || [])
  : []
const workLocks = []
const workLocksDir = 'docs/ugo-work-locks'
if (existsSync(workLocksDir)) {
  for (const name of readdirSync(workLocksDir)) {
    if (!name.endsWith('.json')) continue
    try {
      workLocks.push(JSON.parse(readFileSync(join(workLocksDir, name), 'utf8')))
    } catch (error) {
      if (schedulerPolicy.fail_closed_on_invalid_lock) throw new Error(`Invalid scheduler lock ${name}: ${error.message}`)
    }
  }
}

const evidenceDir = 'docs/evidence'
const evidenceFiles = []
const evidenceLatestByKey = new Map()
const evidenceTimestamp = value => {
  const raw = value?.updated_at || value?.completed_at || value?.created_at || value?.published_at || value?.generated_at || value?.validated_at || ''
  return Date.parse(raw) || 0
}
const evidenceSummaryFor = (name, value) => {
  const independent = value?.independent_validation || {}
  const validators = value?.validators_result || {}
  const counts = value?.counts || value?.safe_final_state || null
  return {
    key: value?.readiness_id || value?.task_id || value?.job_id || name.replace(/\.json$/,''),
    path: join(evidenceDir, name),
    readiness_id: value?.readiness_id || null,
    task_id: value?.task_id || null,
    job_id: value?.job_id || null,
    result: value?.result || value?.final_status || value?.status || value?.workflow_conclusion || null,
    environment: value?.environment || null,
    runtime_sha: value?.runtime_validated_sha || value?.runtime_sha || value?.verified_sha || value?.source_sha || null,
    workflow_run_id: value?.workflow_run_id || value?.runtime?.run_id || null,
    judge: value?.judge || independent.judge || validators.Judge || validators.judge || null,
    sentinel: value?.sentinel || independent.sentinel || validators.Sentinel || validators.sentinel || null,
    counts,
    created_at: value?.created_at || value?.completed_at || value?.updated_at || value?.published_at || value?.generated_at || null,
  }
}
if (existsSync(evidenceDir)) {
  for (const name of readdirSync(evidenceDir)) {
    if (!name.endsWith('.json')) continue
    try {
      const value = JSON.parse(readFileSync(join(evidenceDir,name),'utf8'))
      const summary = evidenceSummaryFor(name,value)
      evidenceFiles.push(summary)
      const previous = evidenceLatestByKey.get(summary.key)
      if (!previous || evidenceTimestamp(value) >= previous.timestamp) {
        evidenceLatestByKey.set(summary.key,{summary,timestamp:evidenceTimestamp(value)})
      }
    } catch (error) {
      throw new Error(`Invalid evidence file ${name}: ${error.message}`)
    }
  }
}
const evidenceRegistry = [...evidenceLatestByKey.values()].map(x=>x.summary).sort((a,b)=>String(a.key).localeCompare(String(b.key)))
const evidenceByReadiness = new Map(evidenceRegistry.filter(x=>x.readiness_id).map(x=>[x.readiness_id,x]))
const stateDrift = []
for (const lock of workLocks) {
  const readinessId = lock.readiness_id || (String(lock.task_id||'').startsWith('readiness-') ? String(lock.task_id).slice('readiness-'.length) : null)
  if (!readinessId) continue
  const evidence = evidenceByReadiness.get(readinessId)
  if (!evidence?.counts || !lock.safe_final_state) continue
  const pairs = [
    ['enabled_agents','enabled'],
    ['executed_agents','executed'],
    ['verified_enabled_agents','verified_enabled'],
    ['disabled_cataloged_agents','disabled_cataloged_only'],
  ]
  for (const [lockKey,evidenceKey] of pairs) {
    const left = lock.safe_final_state?.[lockKey]
    const right = evidence.counts?.[evidenceKey]
    if (left != null && right != null && Number(left)!==Number(right)) {
      stateDrift.push({readiness_id:readinessId,field:lockKey,lock_value:left,evidence_value:right,lock_task_id:lock.task_id,evidence_path:evidence.path})
    }
  }
}

const {
  readiness: functionalReadiness,
  summary: readinessSummary,
} = evaluateFunctionalReadiness({
  functionalReadiness: functionalReadinessSource,
  locks: workLocks,
  pullRequests,
  maxParallel: schedulerPolicy.max_parallel_tasks,
  maxAttempts: schedulerPolicy.max_attempts,
  retryBackoffMinutes: schedulerPolicy.retry_backoff_minutes,
  now: new Date(publishedAt),
})

const readinessDirectActionMap = {
  'client-request': 'client-request-runtime.yml',
  'client-navigation': 'client-navigation-runtime.yml',
  'admin-auth': 'admin-auth-runtime.yml',
  'admin-navigation': 'admin-navigation-runtime.yml',
  'admin-realtime': 'admin-realtime-runtime.yml',
  'admin-users': 'readiness-admin-users.yml',
  'admin-model-router': 'readiness-admin-model-router.yml',
  'admin-qa': 'readiness-admin-qa.yml',
  'admin-responsive': 'role-ui-runtime.yml',
  'admin-risk': 'super-admin-ui-runtime.yml',
  'hugo-presence': 'hugo-presence-runtime.yml',
  'hugo-intent': 'hugo-intent-runtime.yml',
  'hugo-authority': 'hugo-authority-runtime.yml',
  'cross-rls': 'isolated-rpc-rls.yml',
  'auto-agents': 'readiness-auto-agents-test.yml',
  'auto-departments': 'readiness-auto-departments-test.yml',
  'auto-department-job-visibility': 'department-job-visibility-runtime.yml',
}
for (const group of functionalReadiness.groups || []) {
  for (const item of group.items || []) {
    const workflow = readinessDirectActionMap[item.id]
    item.execution_mode = item.real_test_required ? 'HUMAN_REQUIRED' : 'AUTO_SELECT'
    if (workflow) {
      item.execution_route = 'AUTO_SELECT · GPT/UGO para análisis, código, diseño y decisiones; GitHub Direct para runtime/CI determinista.'
      item.direct_action = {
        channel: 'GITHUB_DIRECT',
        label: 'Resolver en GitHub',
        workflow,
        url: 'https://github.com/sebastisnzoth/ugo-admin-panel/actions/workflows/' + workflow,
        production: 'PROTECTED',
      }
    } else if (!item.real_test_required) {
      item.execution_route = item.execution_route || 'GPT_UGO · análisis, código, diseño, debugging y decisiones hasta que exista un workflow seguro específico.'
    }
  }
}

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
    status: 'PENDING',
    owner: 'UGO',
    title: 'Habilitar y validar UGO Empresas en TEST antes de las pruebas reales finales.',
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
    why: 'La validación de software de UGO Empresas debe completarse antes de pedir pruebas humanas reales.',
    resolve: 'Habilitar UGO Empresas en UGO TEST, validar demanda/slots, navegación, acciones, permisos, estados y evidencia sin depender de Customer #1 real.',
    done_evidence: 'UGO Empresas habilitado en TEST + operación funcional verificada + acciones/permisos validados + evidencia persistida del mismo SHA.',
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
  'ugo-empresas': ['d14-audit','super-admin-ui'],
}
const agentRegistry = {
  'ugo-maestro': { department: 'Dirección / Orquestación', agent: 'UGO Maestro', skills: ['planning','dependency-routing','job-control'] },
  'autonomy-worker': { department: 'Plataforma Autónoma', agent: 'Autonomy Worker', skills: ['ugo-job-execution','ugo-github-ops','ugo-runtime-validation','ugo-evidence-judge'] },
  'model-router': { department: 'IA / Plataforma', agent: 'Model Router', skills: ['model-routing','fallback','telemetry','ugo-runtime-validation','ugo-evidence-judge'] },
  'qa-engineer': { department: 'Calidad', agent: 'QA Engineer', skills: ['integration-testing','simulation','regression','ugo-runtime-validation','ugo-evidence-judge'] },
  'recovery-engineer': { department: 'Confiabilidad', agent: 'Recovery Engineer', skills: ['remediation','rollback','incident-recovery','ugo-recovery','ugo-job-execution','ugo-evidence-judge'] },
  'audit-agent': { department: 'Auditoría', agent: 'Audit Agent', skills: ['event-binding','ledger-audit','traceability'] },
  'journey-operator': { department: 'Operaciones', agent: 'Journey Operator', skills: ['p0-journey','matching','payments-ratings'] },
  'release-manager': { department: 'Release / Riesgo', agent: 'Release Manager', skills: ['release-gate','same-sha','launch-control','ugo-github-ops','ugo-evidence-judge'] },
  'frontend-operator': { department: 'Producto / Frontend', agent: 'Super Admin Operator', skills: ['runtime-ui','admin-actions','backend-consistency','ugo-runtime-validation','ugo-evidence-judge'] },
  'enterprise-operator': { department: 'UGO Empresas', agent: 'Enterprise Operator', skills: ['enterprise-ops','demand-slots','customer-readiness'] },
  'judge': { department: 'Control Independiente', agent: 'Judge', skills: ['independent-verification','acceptance-criteria'] },
  'sentinel': { department: 'Seguridad / Riesgo', agent: 'Sentinel', skills: ['safety-gate','invariants','fail-closed'] },
}
const directActionMap = {
  'worker-autonomy': {
    channel: 'GITHUB_DIRECT',
    label: 'Ejecutar prueba autónoma en GitHub',
    workflow: 'autonomous-worker-test.yml',
    url: 'https://github.com/sebastisnzoth/ugo-admin-panel/actions/workflows/autonomous-worker-test.yml',
    audit: 'GitHub actor/run + artifact ugo-execution-audit-<run_id> + Decision/Evidence Ledger + Judge/Sentinel',
    production: 'PROTECTED',
  },
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
  step.execution_channel = directActionMap[step.id]?.channel || 'UGO_MAESTRO'
  if (directActionMap[step.id]) step.direct_action = directActionMap[step.id]
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

const latestLockByTask = new Map()
for (const lock of workLocks) {
  const previous = latestLockByTask.get(lock.task_id)
  const currentStarted = Date.parse(lock.started_at || '') || 0
  const previousStarted = previous ? (Date.parse(previous.started_at || '') || 0) : -1
  if (!previous || currentStarted >= previousStarted) latestLockByTask.set(lock.task_id, lock)
}
const isAuthoritativeDone = taskId => {
  const lock = latestLockByTask.get(taskId)
  if (!lock || lock.status !== 'DONE') return false
  const result = lock.validators_result || {}
  const judge = result.Judge || result.judge
  const sentinel = result.Sentinel || result.sentinel
  const hasEvidenceIds = Array.isArray(lock.evidence_ids) && lock.evidence_ids.length > 0
  const hasCommittedEvidence = Boolean(lock.evidence_path && lock.evidence_commit_sha)
  return judge === 'PASS' && sentinel === 'PASS' && (hasEvidenceIds || hasCommittedEvidence)
}
const completedImplementation = implementationSteps.filter(step => isAuthoritativeDone(step.id))
const pendingImplementation = implementationSteps.filter(step => !isAuthoritativeDone(step.id))
const allWork = [...pendingImplementation, ...finalGateSteps]
const plan = scheduleTasks({
  tasks: allWork,
  locks: workLocks,
  policy: schedulerPolicy,
  now: new Date(publishedAt),
})
const runnable = plan.runnable

const latestCompletedLock = [...workLocks]
  .filter(lock => lock.status === 'DONE' && lock.completed_at)
  .sort((a,b) => (Date.parse(b.completed_at) || 0) - (Date.parse(a.completed_at) || 0))[0] || null

const autoAgentsEvidence = evidenceByReadiness.get('auto-agents') || null
const autoAgentCounts = autoAgentsEvidence?.counts || null
const autonomousCompany = {
  mode: 'OFF',
  mode_reason: 'Estado seguro entre ejecuciones; GitHub Pages no enciende autonomía ni toca producción.',
  policy: schedulerPolicy.version,
  launch: 'BLOCKED',
  working: allWork.filter(x => x.gate_state === 'IN_PROGRESS').length,
  queued: allWork.filter(x => ['QUEUED_CAPACITY','WAITING_RESOURCE_CAPACITY','RETRY_BACKOFF'].includes(x.gate_state)).length,
  approval: allWork.filter(x => x.gate_state === 'HUMAN_REQUIRED').length,
  deferred_real_tests: allWork.filter(x => x.gate_state === 'HUMAN_DEFERRED').length,
  blocked: allWork.filter(x => x.gate_state === 'BLOCKED_DEPENDENCY').length,
  error: allWork.filter(x => x.gate_state === 'FAILED_REQUIRES_REVIEW').length,
  runnable: runnable.length,
  completed: completedImplementation.length,
  latest_completed: latestCompletedLock ? {
    task_id: latestCompletedLock.task_id,
    job_id: latestCompletedLock.job_id || null,
    completed_at: latestCompletedLock.completed_at,
    validators_result: latestCompletedLock.validators_result || null,
  } : null,
  source: 'REPO_LOCKS_SCHEDULER_AND_EVIDENCE',
  agents: autoAgentCounts ? {
    total: Number(autoAgentCounts.cataloged ?? autoAgentCounts.total ?? 0),
    enabled: Number(autoAgentCounts.enabled ?? 0),
    executed: Number(autoAgentCounts.executed ?? 0),
    verified: Number(autoAgentCounts.verified_enabled ?? autoAgentCounts.verified ?? 0),
    disabled: Number(autoAgentCounts.disabled_cataloged_only ?? autoAgentCounts.disabled ?? 0),
    evidence_path: autoAgentsEvidence?.path || null,
    evidence_created_at: autoAgentsEvidence?.created_at || null,
  } : null,
}

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
  autonomous_company: autonomousCompany,
  evidence_registry: evidenceRegistry,
  evidence_summary: {
    files: evidenceFiles.length,
    latest_records: evidenceRegistry.length,
    passed: evidenceRegistry.filter(x => ['PASS','SUCCESS','VERIFIED','DONE'].includes(String(x.result||'').toUpperCase()) || (String(x.judge||'').toUpperCase()==='PASS' && String(x.sentinel||'').toUpperCase()==='PASS')).length,
    drift_count: stateDrift.length,
  },
  state_drift: stateDrift,
  functional_readiness: functionalReadiness,
  functional_readiness_summary: readinessSummary,
  implementation_steps: pendingImplementation,
  completed_implementation_steps: completedImplementation.map(step => ({...step, status:'DONE', gate_state:'DONE', gate_reason:'Judge + Sentinel PASS con evidencia persistida.'})),
  final_gate_steps: finalGateSteps,
  organization: {
    orchestrator: agentRegistry['ugo-maestro'],
    validators: [agentRegistry.judge, agentRegistry.sentinel],
    agents: Object.values(agentRegistry),
    operating_model: 'ORCHESTRATOR → ASSIGNED JOB → SPECIALIST → QA/EVIDENCE → JUDGE → SENTINEL → DONE',
  },
  active_locks: plan.activeLocks,
  stale_locks: plan.staleLocks,
  scheduler: plan.summary,
  scheduler_policy: {
    version: schedulerPolicy.version,
    max_parallel_tasks: schedulerPolicy.max_parallel_tasks,
    default_lease_minutes: schedulerPolicy.default_lease_minutes,
    max_attempts: schedulerPolicy.max_attempts,
    fairness: schedulerPolicy.fairness,
    execution_strategy: schedulerPolicy.execution_strategy || 'AUTONOMOUS_FIRST',
    defer_human_gates_until_autonomous_exhausted: Boolean(schedulerPolicy.defer_human_gates_until_autonomous_exhausted),
  },
  runnable_steps: runnable.map(x => x.id),
  counts: {
    implementation_pending: pendingImplementation.length,
    final_gate_blockers: finalGateSteps.length,
    total_visible_work_items: allWork.length,
    human_involved: allWork.filter(x => x.owner.includes('SERGIO')).length,
    runnable_now: runnable.length,
    in_progress: allWork.filter(x => x.gate_state === 'IN_PROGRESS').length,
    blocked_dependency: allWork.filter(x => x.gate_state === 'BLOCKED_DEPENDENCY').length,
    waiting_conflict: allWork.filter(x => ['WAITING_RESOURCE_CAPACITY','QUEUED_CAPACITY'].includes(x.gate_state)).length,
    stale_locks: plan.staleLocks.length,
    human_required: allWork.filter(x => x.gate_state === 'HUMAN_REQUIRED').length,
    human_deferred: allWork.filter(x => x.gate_state === 'HUMAN_DEFERRED').length,
    retry_backoff: allWork.filter(x => x.gate_state === 'RETRY_BACKOFF').length,
    failed_review: allWork.filter(x => x.gate_state === 'FAILED_REQUIRES_REVIEW').length,
  },
  next_movement: runnable[0]
    || allWork.find(x => x.gate_state === 'IN_PROGRESS')
    || allWork.find(x => ['FAILED_REQUIRES_REVIEW','STALE_LOCK','RETRY_BACKOFF'].includes(x.gate_state))
    || allWork.find(x => x.scheduler?.human_gate === false && ['BLOCKED_DEPENDENCY','WAITING_RESOURCE_CAPACITY','QUEUED_CAPACITY'].includes(x.gate_state))
    || allWork.find(x => x.gate_state === 'HUMAN_REQUIRED')
    || allWork.find(x => x.gate_state === 'HUMAN_DEFERRED')
    || allWork[0]
    || null,
  refresh_policy: {
    mode: 'EVENT_PLUS_SCHEDULE',
    minutes: 5,
  },
  needs_sergio_now:
    runnable.length === 0
    && !allWork.some(x => ['IN_PROGRESS','FAILED_REQUIRES_REVIEW','STALE_LOCK','RETRY_BACKOFF'].includes(x.gate_state))
    && allWork.some(x => x.gate_state === 'HUMAN_REQUIRED')
    && !allWork.some(x => x.scheduler?.human_gate === false),
}

writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n')
console.log(`UGO Scheduler ${plan.summary.policy_version} · runnable ${status.counts.runnable_now} · active ${status.counts.in_progress} · stale ${status.counts.stale_locks} · pending ${status.counts.total_visible_work_items}`)
