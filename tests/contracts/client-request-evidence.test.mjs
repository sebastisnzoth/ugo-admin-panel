import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('request photos stay optional and upload failures never block the request contract',async()=>{
 const source=await read('src/features/client/request/ClientRequestEvidence.tsx')
 const guided=await read('src/mvp/client/ClientGuidedRequest.tsx')
 assert.match(source,/Son opcionales/)
 assert.doesNotMatch(source,/Necesitás al menos una foto para enviar la solicitud/)
 assert.doesNotMatch(source,/Adjuntá al menos una foto clara/)
 assert.match(source,/storage\.from\(BUCKET\)\.remove\(\[uploadedPath\]\)/)
 assert.match(source,/Probá otra vez o enviá la solicitud sin foto/)
 assert.match(guided,/FOTO OPCIONAL/)
 assert.match(guided,/Podés Continuar sin foto/)
 assert.match(guided,/async function submit\(\)\{if\(!session\|\|!draft\.categoryId\|\|draft\.description\.trim\(\)\.length<8\|\|!draft\.address\.trim\(\)\)return/)
 assert.match(guided,/request_draft_id:draftId/)
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
 const [source,css,need,guided]=await Promise.all([
  read('src/features/client/request/ClientRequestEvidence.tsx'),
  read('src/features/client/request/clientRequestEvidence.css'),
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/mvp/client/ClientGuidedRequest.tsx')
 ])
 assert.match(source,/\.\/clientRequestEvidence\.css/)
 assert.doesNotMatch(source,/mvp\/ClientRequestEvidence/)
 assert.match(need,/\.\/ClientRequestEvidence/)
 assert.match(guided,/features\/client\/request\/ClientRequestEvidence/)
 assert.match(css,/\.ugo-request-evidence-panel/)
})
