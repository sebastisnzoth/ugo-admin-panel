import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const ui=fs.readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8')
test('workforce center exposes human operational controls without fake mass enable',()=>{
 for(const label of ['TOTAL AGENTES','ACTIVOS','TRABAJANDO AHORA','PAUSADOS','DESHABILITADOS','APROBACIÓN HUMANA','INCONSISTENCIAS GREEN','CON ERROR','BLOQUEADOS POR SEGURIDAD'])assert.match(ui,new RegExp(label,'i'))
 for(const label of ['Buscar agente','Mostrar solo los que necesitan mi atención','Ejecutar ahora','No listo para habilitar','Kill switch','Ver actividad'])assert.match(ui,new RegExp(label,'i'))
 assert.doesNotMatch(ui,/Habilitar todos/i)
 assert.match(ui,/requiresHumanApproval/)
 assert.match(ui,/greenApprovalInconsistency/)
 assert.match(ui,/GREEN no requiere aprobación humana/)
})
test('manual execution uses governed enqueue and disabled agents stay non executable',()=>{
 assert.match(ui,/autonomous_enqueue_job/)
 assert.match(ui,/a\.status==='DISABLED'/)
 assert.match(ui,/WAITING_APPROVAL/)
 assert.match(ui,/approval_count/)
})
test('detail exposes persisted jobs decisions evidence configuration and audit',()=>{
 for(const tab of ['Resumen','Actividad','Decisiones','Evidencia','Configuración','Auditoría'])assert.match(ui,new RegExp(tab))
 assert.match(ui,/selectedDecisions/)
 assert.match(ui,/selectedEvidence/)
 assert.match(ui,/selectedFindings/)
 assert.match(ui,/no se crea evidencia falsa/i)
})
