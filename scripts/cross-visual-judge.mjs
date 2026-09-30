import assert from'node:assert/strict'
import{access,readFile,stat,writeFile}from'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtime=JSON.parse(await readFile('artifacts/role-ui-runtime.json','utf8'))
assert.equal(runtime.task,'role-ui-runtime')
assert.equal(runtime.sha,sha,'SAME_SHA_REQUIRED')
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.page_errors,0)
assert.ok(Array.isArray(runtime.results)&&runtime.results.length>=12,'ROLE_UI_RESULTS_INCOMPLETE')
assert.ok(runtime.results.every(item=>item.status==='PASS'),'ROLE_UI_RESULT_FAILED')
const clientResults=runtime.results.filter(item=>item.role==='client')
const providerResults=runtime.results.filter(item=>item.role==='provider')
const adminResults=runtime.results.filter(item=>item.role==='admin')
assert.equal(clientResults.length,2,'CLIENT_VIEWPORT_COVERAGE_INCOMPLETE')
assert.ok(clientResults.every(item=>Number(item.menu_items)>=9),'CLIENT_ROUTE_COVERAGE_INCOMPLETE')
assert.equal(providerResults.length,2,'PROVIDER_VIEWPORT_COVERAGE_INCOMPLETE')
assert.ok(providerResults.some(item=>item.viewport==='desktop'&&Number(item.menu_items)>=7),'PROVIDER_DESKTOP_ROUTE_COVERAGE_INCOMPLETE')
assert.ok(providerResults.some(item=>item.viewport==='mobile'&&Number(item.menu_items)>=4),'PROVIDER_MOBILE_ROUTE_COVERAGE_INCOMPLETE')
assert.equal(adminResults.length,2,'ADMIN_VIEWPORT_COVERAGE_INCOMPLETE')
assert.ok(adminResults.every(item=>Number(item.main_items)>=6&&Number(item.autonomous_items)>=12),'ADMIN_ROUTE_COVERAGE_INCOMPLETE')

const shots=[
 'role-ui-client-desktop.png','role-ui-client-mobile.png',
 'role-ui-provider-desktop.png','role-ui-provider-mobile.png',
 'role-ui-admin-desktop.png','role-ui-admin-mobile.png',
]
const screenshotEvidence=[]
for(const name of shots){
 const path='artifacts/'+name
 await access(path)
 const info=await stat(path)
 assert.ok(info.size>1000,name+' screenshot too small')
 screenshotEvidence.push({name,bytes:info.size})
}
for(const role of ['client','provider','admin']){
 for(const viewport of ['desktop','mobile']){
  assert.ok(runtime.results.some(item=>item.role===role&&item.viewport===viewport&&item.status==='PASS'),role+' '+viewport+' missing')
 }
}
assert.ok(runtime.results.filter(item=>item.role==='admin-auth'&&item.access==='DENIED').length>=6,'ADMIN_AUTH_BOUNDARY_INCOMPLETE')

const out={
 validator:'Judge',
 readiness_id:'cross-visual',
 tested_sha:sha,
 environment:'UGO TEST local authenticated runtime',
 production_touched:false,
 contract:'PASS',
 responsive_cross_role:'PASS',
 route_hierarchy:'PASS',
 screenshots:screenshotEvidence,
 result:'PASS',
 checked_at:new Date().toISOString(),
}
await writeFile(`artifacts/cross-visual-judge-${sha}.json`,JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
