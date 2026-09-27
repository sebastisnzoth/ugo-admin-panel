import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const ui=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
test('Super Admin exposes persisted autonomous agent directory and detail',()=>{
 for(const table of ['autonomous_agents','autonomous_jobs','autonomous_decision_ledger','autonomous_evidence_ledger','autonomous_audit_findings','autonomous_kill_switches'])assert.match(ui,new RegExp(table))
 assert.match(ui,/No existen agentes registrados actualmente\./)
 assert.match(ui,/Ficha del agente/)
 assert.match(ui,/Trabajos reales/)
 assert.match(ui,/Decisiones/)
 assert.match(ui,/Evidencia/)
 assert.match(ui,/Auditoría relacionada/)
})
test('kill switch mutation stays behind authorized RPC',()=>{
 assert.match(ui,/superadmin_set_kill_switch/)
 assert.doesNotMatch(ui,/from\('autonomous_kill_switches'\)\.update/)
})
test('agent UI never embeds OpenRouter credentials',()=>{
 assert.doesNotMatch(ui,/VITE_OPENROUTER_API_KEY|Bearer \$\{.*OPENROUTER/)
})

test('agent consultation is evidence grounded and honest when unsupported',()=>{assert.match(ui,/Consultar agente/);assert.match(ui,/DATOS PERSISTIDOS/);assert.match(ui,/INTERPRETACIÓN/);assert.match(ui,/NO HAY EVIDENCIA SUFICIENTE/);assert.doesNotMatch(ui,/fetch\(['\"]\/api\/autonomy\/openrouter/)})
