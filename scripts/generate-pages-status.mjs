import { readFileSync, writeFileSync } from 'node:fs'

const [sourcePath, outPath, sourceSha, publishedAt] = process.argv.slice(2)
if (!sourcePath || !outPath || !sourceSha || !publishedAt) {
  throw new Error('usage: node generate-pages-status.mjs <source> <out> <sha> <published-at>')
}

const source = readFileSync(sourcePath, 'utf8')
const must = (re, label) => {
  const match = source.match(re)
  if (!match) throw new Error(`UGO Pages evidence missing: ${label}`)
  return match
}
const clean = value => value.replace(/`/g, '').replace(/\*\*/g, '').trim()\nconst evidence_url = 'https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/UGO_AUTONOMOUS_CORPORATION_IMPLEMENTATION.md'

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
    why: 'Todavía falta demostrar que la autonomía funciona sin una sesión de navegador abierta.',
    resolve: 'Ejecutar el worker programado en UGO TEST con autonomía ON, comprobar que reclama y completa un job permitido, persiste Decision/Evidence Ledger y vuelve a un estado seguro.',
    done_evidence: 'Run del workflow en el mismo SHA + job SUCCEEDED persistido + ledger correlacionado + Sentinel PASS + autonomía segura al finalizar.',
    owner: 'UGO'
  }
  if (t.includes('openrouter')) return {
    why: 'Configuración y credencial no alcanzan: falta validar el consumo real y el fallback en runtime.',
    resolve: 'Ejecutar una consulta protegida en TEST/Preview usando primary gratuito, forzar o probar el fallback y persistir calidad, latencia, fallo/costo y selección del modelo.',
    done_evidence: 'Primary y fallback ejecutados, telemetría persistida, costo dentro de política y verificación del mismo SHA.',
    owner: 'UGO'
  }
  if (t.includes('bind qa simulators')) return {
    why: 'Los simuladores no pueden autocertificarse con booleans suministrados por el caller.',
    resolve: 'Conectar Client/Provider/Admin simulados a las acciones reales de UGO TEST y juzgar el resultado desde estado persistido independiente.',
    done_evidence: 'serviceId real TEST + acciones autenticadas + judge independiente + QA run persistido + cobertura sólo después de PASS.',
    owner: 'UGO'
  }
  if (t.includes('chaos')) return {
    why: 'El Master exige demostrar comportamiento frente a fallos y no sólo el camino feliz.',
    resolve: 'Inyectar fallos controlados en el P0 de TEST (realtime, dependencia, timing o transición), verificar contención, recuperación y ausencia de corrupción.',
    done_evidence: 'Chaos run persistido + detección + recuperación verificada + regresión permanente.',
    owner: 'UGO'
  }
  if (t.includes('remediation')) return {
    why: 'Falta cerrar automáticamente el ciclo detectar → corregir → reprobar.',
    resolve: 'Provocar un fallo conocido, generar remediation request, aplicar una corrección segura, reejecutar el escenario y guardar la regresión.',
    done_evidence: 'Fallo inicial + remediation + rerun PASS + test/regresión persistente ligados por correlation_id.',
    owner: 'UGO'
  }
  if (t.includes('release gate')) return {
    why: 'El gate debe demostrar que bloquea con evidencia incompleta y libera sólo cuando corresponde.',
    resolve: 'Reevaluar el Release Gate con escenarios positivos y negativos en TEST y comprobar que los blockers provienen del estado persistido actual.',
    done_evidence: 'Evaluación determinista persistida + caso bloqueado correcto + caso elegible correcto cuando todos los requisitos estén satisfechos.',
    owner: 'UGO'
  }
  if (t.includes('event binding')) return {
    why: 'Los eventos del servicio deben quedar unidos a la auditoría corporativa por el mismo serviceId/correlation_id.',
    resolve: 'Ejecutar un P0 en TEST y verificar que matching, llegada, evidencias, pago, cierre y auditoría se enlazan sin mezclar servicios.',
    done_evidence: 'Cadena completa de eventos y ledgers consultable para un único serviceId y mismo correlation_id.',
    owner: 'UGO'
  }
  if (t.includes('complete test journey')) return {
    why: 'Todavía se exige una ejecución completa de punta a punta en TEST por un único servicio.',
    resolve: 'Crear una solicitud TEST y completar matching → aceptación → viaje → llegada → evidencia inicial → trabajo → evidencia final → aprobación → pago → cierre → ratings.',
    done_evidence: 'Un serviceId con todos los estados y evidencias persistidos, sin edición manual de DB.',
    owner: 'UGO'
  }
  if (t.includes('recover without raw')) return {
    why: 'Una empresa autónoma no puede depender de editar Supabase/GitHub a mano para excepciones normales.',
    resolve: 'Ejecutar una excepción recuperable en TEST y resolverla mediante los mecanismos de UGO, sin SQL manual ni cambios directos de estado.',
    done_evidence: 'Incidente persistido + acción de recuperación autorizada + verificación posterior + audit trail completo.',
    owner: 'UGO'
  }
  if (t.includes('d14 independent')) return {
    why: 'La auditoría debe ser independiente del ejecutor y cerrar hallazgos con re-auditoría.',
    resolve: 'Ejecutar D14 sobre el resultado actual, registrar findings, corregir los aplicables y volver a auditar con evidencia nueva.',
    done_evidence: 'Audit run independiente + findings + remediation + re-audit PASS o blockers externos explícitos.',
    owner: 'UGO'
  }
  if (t.includes('customer #1 launch gate')) return {
    why: 'El lanzamiento depende de evidencia real y no puede declararse READY desde un demo.',
    resolve: 'Reevaluar el gate después de completar el flujo humano real y las pruebas de dos dispositivos; no editar el resultado manualmente.',
    done_evidence: 'Customer #1 real aceptado + FULL-E2E aprobado + TWO-DEVICES aprobado + gate persistido READY.',
    owner: 'SERGIO + UGO'
  }
  if (t.includes('super admin')) return {
    why: 'La UI existe, pero todavía debe demostrarse que refleja y acciona el estado autoritativo en runtime.',
    resolve: 'Abrir Super Admin en TEST/Preview, recorrer autonomía, QA, Model Router, Risk/Audit, Launch Gate y timeline, y verificar cada lectura/acción contra backend.',
    done_evidence: 'Prueba runtime de UI + acciones autorizadas + estados concordantes con backend + evidencia del mismo SHA.',
    owner: 'UGO'
  }
  if (t.includes('ugo empresas')) return {
    why: 'Está deliberadamente detrás de la estabilidad del núcleo y Customer #1.',
    resolve: 'Primero cerrar Customer #1 y el núcleo; luego habilitar la ejecución de UGO Empresas y validar demanda/slots en TEST.',
    done_evidence: 'Customer #1 estable + ejecución UGO Empresas habilitada + operación TEST verificada.',
    owner: 'UGO'
  }
  return {
    why: 'Es un requisito explícito del Master que todavía no tiene evidencia suficiente para DONE.',
    resolve: 'Completar implementación, wiring, ejecución real en TEST, verificación determinista y evidencia persistida del mismo SHA.',
    done_evidence: 'Implementado + CI validado + runtime validado + regresión/evidencia persistente.',
    owner: 'UGO'
  }
}
for (const [index, step] of implementationSteps.entries()) {
  Object.assign(step, resolutionFor(step.title))
  step.order = index + 1
  step.depends_on = index === 0 ? [] : [implementationSteps[index - 1].id]
  step.evidence_url = evidence_url
}

const blockerDetails = {
  FOUNDER_CHALLENGE_PENDING: {
    title: 'Founder Challenge',
    why: 'El Master lo reserva a intervención humana y actualmente figura PLANNED.',
    resolve: 'Sergio revisa el desafío del fundador y registra la decisión/aceptación correspondiente; UGO luego persiste y reevalúa el audit final.',
    done_evidence: 'Founder Challenge registrado como completado con decisión humana auditable y re-auditoría posterior.',
    owner: 'SERGIO + UGO'
  },
  PHYSICAL_GPS_DEVICE_UNVERIFIED: {
    title: 'GPS físico real',
    why: 'Una simulación no demuestra ubicación real, permisos del dispositivo, frescura GPS ni geofence en hardware.',
    resolve: 'Ejecutar el flujo Cliente/Proveedor en dispositivos físicos, obtener GPS reciente válido, rechazar 0,0/fake/stale y confirmar llegada dentro del geofence exigido.',
    done_evidence: 'Evidencia física vinculada a un serviceId + timestamps + geofence PASS + audit trail persistido.',
    owner: 'SERGIO + UGO'
  },
  REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED: {
    title: 'Customer #1 real',
    why: 'El objetivo final exige aceptación humana real; un demo, fixture o edición manual no puede reemplazarla.',
    resolve: 'Completar el viaje real con Cliente y Proveedor en dos dispositivos, aprobar FULL-E2E/TWO-DEVICES y registrar aceptación del Customer #1.',
    done_evidence: 'Servicio real completo + aceptación humana + FULL-E2E aprobado + TWO-DEVICES aprobado + Launch Gate reevaluado.',
    owner: 'SERGIO + UGO'
  }
}
const finalGateSteps = blockersMatch.slice(1,4).map((code, index) => ({
  id: `final-gate-${index + 1}`,
  phase: 'Final Gate',
  status: 'BLOCKED',
  code,
  ...(blockerDetails[code] || {
    title: code,
    why: 'Bloqueo persistido del audit final.',
    resolve: 'Resolver la condición y reejecutar la auditoría.',
    done_evidence: 'Audit final sin este blocker.',
    owner: 'UGO'
  })
}))

const status = {
  title: 'UGO Implementation Command Center',
  source: sourcePath,
  source_sha: sourceSha,
  published_at_utc: publishedAt,
  environment: 'UGO TEST / GitHub Pages',
  production: 'PROTECTED',
  production_ready: false,\n  state: 'IN_PROGRESS',\n  evidence_url,
  objective: 'UGO Launch Ready — Florianópolis',
  objective_path: 'Cliente → solicitud → matching ≤20 km → aceptación → GPS/viaje → llegada → evidencias → trabajo → aprobación → pago → cierre → ratings → auditoría',
  quality_coverage: { covered: Number(coverageMatch[1]), total: Number(coverageMatch[2]) },
  assurance: [
    { name: 'META_AUDIT', status: 'PASSED' },
    { name: 'RED_TEAM', status: 'PASSED' },
    { name: 'DIGITAL_TWIN', status: 'PASSED' },
  ],
  corporate_final_audit: { status: 'BLOCKED', blockers: blockersMatch.slice(1,4) },
  customer_1: 'BLOCKED',
  customer_1_reason: 'CUSTOMER_ACCEPTANCE_NOT_APPROVED',
  implementation_steps: implementationSteps,
  final_gate_steps: finalGateSteps,
  counts: {
    implementation_pending: implementationSteps.length,
    final_gate_blockers: finalGateSteps.length,
    total_visible_work_items: implementationSteps.length + finalGateSteps.length,
    human_involved: [...implementationSteps, ...finalGateSteps].filter(x => x.owner.includes('SERGIO')).length,
  },
  next_movement: implementationSteps[0] || finalGateSteps[0] || null,\n  refresh_policy: { mode: 'EVENT_PLUS_SCHEDULE', minutes: 15 },
  needs_sergio_now: finalGateSteps.some(x => x.owner.includes('SERGIO')),
}

writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n')
console.log(`UGO Pages command center · implementation pending ${status.counts.implementation_pending} · final blockers ${status.counts.final_gate_blockers}`)
