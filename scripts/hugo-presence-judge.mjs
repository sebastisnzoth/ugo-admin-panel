import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const runtime=JSON.parse(await fs.readFile('artifacts/hugo-presence-runtime.json','utf8'))
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(runtime.readiness_id,'hugo-presence')
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.sha,sha)
assert.equal(runtime.correlation_id,'readiness-hugo-presence-20260929T204700Z')
assert.equal(runtime.results.length,6)

for(const role of ['client','provider','admin']){
 for(const width of [1440,390]){
  const row=runtime.results.find(item=>item.role===role&&item.viewport?.width===width)
  assert.ok(row,role+' '+width+' evidence missing')
  assert.equal(row.status,'PASS',role+' '+width+' runtime must PASS')
  const box=row.trigger_box,viewport=row.viewport
  assert.ok(box&&viewport,role+' '+width+' trigger geometry missing')
  assert.ok(box.x>=-1&&box.y>=-1,role+' '+width+' trigger clipped above/left')
  assert.ok(box.x+box.width<=viewport.width+1,role+' '+width+' trigger clipped right')
  assert.ok(box.y+box.height<=viewport.height+1,role+' '+width+' trigger clipped bottom')
  assert.ok(box.y>=viewport.height*0.45,role+' '+width+' trigger not in lower non-invasive zone')
 }
}

const evidence={
 validator:'Judge',
 readiness_id:'hugo-presence',
 sha,
 correlation_id:runtime.correlation_id,
 result:'PASS',
 basis:'Independent derivation from six persisted browser-runtime role/viewport observations',
 checks:['client-desktop','provider-desktop','admin-desktop','client-mobile','provider-mobile','admin-mobile','viewport-bounds','lower-non-invasive-zone'],
 validated_at:new Date().toISOString()
}
await fs.writeFile('artifacts/hugo-presence-judge.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
