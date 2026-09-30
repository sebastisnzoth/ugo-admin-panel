import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const evidence=JSON.parse(await fs.readFile('artifacts/admin-responsive-runtime.json','utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(evidence.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(evidence.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(evidence.readiness_id,'admin-responsive','JUDGE_READINESS_ID')
assert.equal(evidence.viewports?.length,3,'JUDGE_VIEWPORT_MATRIX_REQUIRED')
assert.deepEqual(evidence.viewports.map(v=>v.id),['mobile','tablet','desktop'],'JUDGE_VIEWPORT_NAMES')
assert.deepEqual(evidence.page_errors,[],'JUDGE_PAGE_ERRORS')
for(const v of evidence.viewports){
 assert.ok(v.sections.length>=5,'JUDGE_SECTION_COVERAGE:'+v.id)
 for(const s of v.sections){
  assert.ok(s.metrics.document.scrollWidth<=s.metrics.document.clientWidth+1,'JUDGE_DOCUMENT_OVERFLOW:'+v.id+':'+s.section)
  assert.ok(s.metrics.shell.scrollWidth<=s.metrics.shell.clientWidth+1,'JUDGE_SHELL_OVERFLOW:'+v.id+':'+s.section)
 }
 for(const shot of v.screenshots)await fs.access('artifacts/'+shot)
}
const out={validator:'Judge',status:'PASS',task_id:'readiness-admin-responsive',readiness_id:'admin-responsive',sha,checked_at:new Date().toISOString(),basis:['3 viewport browser matrix','Admin top-level navigation','Super Admin tabs when authorized','document/shell overflow measurements','persisted screenshots']}
await fs.writeFile('artifacts/admin-responsive-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
