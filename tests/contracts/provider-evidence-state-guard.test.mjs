import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider evidence is state-gated and storage-bound',async()=>{
 const[stateGuard,storageGuard,screen,active]=await Promise.all([
  read('supabase/migrations/20260911215500_service_evidence_state_guard.sql'),
  read('supabase/migrations/20260914232954_service_evidence_storage_integrity_guard.sql'),
  read('src/mvp/provider/ProviderEvidencePanel.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx')
 ])
 assert.match(stateGuard,/new\.tipo = 'antes' and v_servicio\.estado <> 'llegado'/)
 assert.match(stateGuard,/new\.tipo = 'durante' and v_servicio\.estado <> 'en_progreso'/)
 assert.match(stateGuard,/new\.tipo = 'despues' and v_servicio\.estado not in \('en_progreso','esperando_aprobacion'\)/)
 assert.match(storageGuard,/service_evidence_object_exists/)
 assert.match(storageGuard,/bucket_id='service-evidence'/)
 assert.match(screen,/estado==='llegado'\?\['antes'\]/)
 assert.match(screen,/estado==='en_progreso'\?\['durante','despues'\]/)
 assert.match(active,/evidence\.initial\?'Empezá el trabajo':'Sacá la foto inicial'/)
 assert.match(active,/evidence\.final\?'Marcá el trabajo listo':'Sacá la foto final'/)
 assert.match(active,/forceKind="antes"/)
 assert.match(active,/forceKind="despues"/)
})
