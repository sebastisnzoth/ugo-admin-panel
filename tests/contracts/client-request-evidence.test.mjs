import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('request photos stay optional and upload failures never block the canonical request contract',async()=>{
 const[source,need,post]=await Promise.all([
  read('src/features/client/request/ClientRequestEvidence.tsx'),
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/mvp/client/ClientPostConfirmFlow.tsx')
 ])
 assert.match(source,/Son opcionales/)
 assert.doesNotMatch(source,/Necesitás al menos una foto para enviar la solicitud/)
 assert.doesNotMatch(source,/Adjuntá al menos una foto clara/)
 assert.match(source,/Probá otra vez o enviá la solicitud sin foto/)
 assert.match(need,/Fotos del trabajo <small>\(opcional\)<\/small>/)
 assert.match(need,/Podés continuar sin fotos/)
 assert.match(need,/disabled=\{!canContinue\|\|photoBusy\}/)
 assert.doesNotMatch(need,/photoCount\s*===\s*0.*return/)
 assert.match(post,/request_draft_id:requestDraftId/)
})

test('request evidence repair migration restores draft binding and mobile image formats',async()=>{
 const sql=await read('supabase/migrations/20260913192000_request_evidence_upload_repair.sql')
 assert.match(sql,/add column if not exists draft_id uuid/)
 assert.match(sql,/idx_evidencias_solicitud_cliente_draft_pending/)
 assert.match(sql,/request-evidence/)
 assert.match(sql,/image\/heic/)
 assert.match(sql,/image\/heif/)
 assert.match(sql,/draft_id=v_draft_id/)
})

test('request evidence component and CSS live behind the request feature boundary',async()=>{
 const[source,css,need]=await Promise.all([
  read('src/features/client/request/ClientRequestEvidence.tsx'),
  read('src/features/client/request/clientRequestEvidence.css'),
  read('src/features/client/request/ClientNeedScreen.tsx')
 ])
 assert.match(source,/\.\/clientRequestEvidence\.css/)
 assert.doesNotMatch(source,/mvp\/ClientRequestEvidence/)
 assert.match(need,/\.\/ClientRequestEvidence/)
 assert.match(css,/\.ugo-request-evidence-panel/)
})
