import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('disputes v2 freeze context, support structured reasons and amicable agreement',async()=>{
 const[migration,hook,dock,policy]=await Promise.all([
  read('supabase/migrations/20260920151000_dispute_rules_ai_snapshot.sql'),
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/DisputeDock.tsx'),
  read('docs/UGO_DISPUTE_RULES_MASTER.md')
 ])
 assert.match(migration,/reglas_motivos_disputa/)
 assert.match(migration,/capture_dispute_snapshot/)
 assert.match(migration,/acuerdos_previos_disputa/)
 assert.match(migration,/dispute-evidence/)
 assert.match(migration,/abrir_disputa_v2/)
 assert.match(migration,/revoke execute on function public\.abrir_disputa\(uuid,text,jsonb\) from authenticated/)
 assert.match(hook,/proponer_acuerdo_previo/)
 assert.match(hook,/abrir_disputa_v2/)
 assert.match(hook,/dispute-evidence/)
 assert.match(dock,/DISPUTA FORMAL/)
 assert.match(dock,/Enviar propuesta amistosa/)
 assert.match(policy,/48 horas/)
 assert.match(policy,/168 horas/)
 assert.match(policy,/Una foto demuestra sólo lo que se observa/)
})

test('AI dispute analysis is admin-only decision support and can inspect images',async()=>{
 const[api,panel,policy]=await Promise.all([
  read('api/disputes/analyze.ts'),
  read('src/mvp/AdminDisputeAssistant.tsx'),
  read('docs/UGO_DISPUTE_RULES_MASTER.md')
 ])
 assert.match(api,/Solo Admin puede analizar disputas/)
 assert.match(api,/inlineData/)
 assert.match(api,/nunca atribuyas quién causó un daño/i)
 assert.match(api,/disputa_ai_analisis/)
 assert.match(panel,/No ejecuta pagos ni resuelve el caso por sí sola/)
 assert.match(panel,/Usar como borrador del fundamento/)
 assert.match(policy,/toda resolución final la confirma Admin/i)
})
