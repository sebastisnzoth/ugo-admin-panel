import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const sql=fs.readFileSync('supabase/migrations/20260930155500_pilot_marido_regulated_work_guard.sql','utf8')
const client=fs.readFileSync('src/features/client/request/ClientNeedScreen.tsx','utf8')
test('marido generic services fail closed for regulated or high-risk work',()=>{assert.match(sql,/pilot_servicio_generico_permitido/);assert.match(sql,/PILOT_REGULATED_WORK_REQUIRES_RECLASSIFICATION/);assert.match(sql,/proveedor_puede_recibir_oferta/);assert.match(sql,/más de 2|mais de 2/);assert.match(sql,/gas/);assert.match(sql,/eletric|electric/)})
test('client explains regulated-work diversion before submission',()=>{assert.match(client,/Trabajos eléctricos, gas, estructurales o de riesgo deben derivarse/)})
