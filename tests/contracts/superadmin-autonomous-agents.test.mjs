import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const shell=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const workforce=fs.readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8')
const ui=shell+'\n'+workforce
test('Super Admin exposes persisted autonomous agent directory and detail',()=>{
 for(const table of ['autonomous_agents','autonomous_jobs','autonomous_decision_ledger','autonomous_evidence_ledger','autonomous_audit_findings','autonomous_kill_switches'])assert.match(ui,new RegExp(table))
 assert.match(ui,/No hay agentes que coincidan con los filtros\./)
 assert.match(ui,/Detalle del agente/)
 assert.match(ui,/Actividad/)
 assert.match(ui,/Decisiones/)
 assert.match(ui,/Evidencia/)
 assert.match(ui,/Auditoría/)
})
test('kill switch mutation stays behind authorized RPC',()=>{
 assert.match(ui,/superadmin_set_kill_switch/);assert.match(ui,/superadmin_recover_kill_switch/)
 assert.doesNotMatch(ui,/from\('autonomous_kill_switches'\)\.update/)
})
test('agent UI never embeds OpenRouter credentials',()=>{
 assert.doesNotMatch(ui,/VITE_OPENROUTER_API_KEY|Bearer \$\{.*OPENROUTER/)
})

test('agent consultation is checked server-side and never sends caller evidence',()=>{const api=fs.readFileSync('api/test.ts','utf8');assert.match(ui,/Consultar agente/);assert.match(ui,/agent_id:selectedAgent.id/);assert.match(api,/NO HAY EVIDENCIA SUFICIENTE/);assert.match(ui,/ugo_autonomy_model=1/);assert.match(ui,/correlation_id/);assert.doesNotMatch(ui,/Evidencia autorizada:/)})
