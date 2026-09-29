import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('uploaded media coverage requires protected Storage runtime proof',async()=>{
 const[sql,probe,workflow,coverage]=await Promise.all([
  read('supabase/migrations/20260929124500_qa_uploaded_media_bytes_runtime.sql'),
  read('scripts/autonomous-uploaded-media-runtime.mjs'),
  read('.github/workflows/autonomous-worker-test.yml'),
  read('scripts/autonomous-quality-coverage-runtime.mjs')
 ])
 assert.match(sql,/PRIVATE_SERVICE_EVIDENCE_BUCKET_REQUIRED/)
 assert.match(sql,/FETCHED_BYTE_SIZE_MISMATCH/)
 assert.match(sql,/PRIVATE_ACCESS_NOT_PROVEN/)
 assert.match(sql,/qa\.uploaded_media_bytes_runtime/)
 assert.match(sql,/coverage_key='uploaded-media-bytes'/)
 assert.match(probe,/createSignedUrl/)
 assert.match(probe,/arrayBuffer/)
 assert.match(probe,/createHash\('sha256'\)/)
 assert.match(probe,/PRIVATE_BUCKET_PUBLIC_ACCESS_UNEXPECTED/)
 assert.match(workflow,/node scripts\/autonomous-uploaded-media-runtime\.mjs/)
 assert.ok(workflow.indexOf('autonomous-uploaded-media-runtime.mjs')<workflow.indexOf('autonomous-quality-coverage-runtime.mjs'))
 assert.match(coverage,/uploaded-media-bytes'&&x\.status==='COVERED'/)
 assert.match(coverage,/\['physical-gps-device','real-customer-acceptance'\]/)
})
