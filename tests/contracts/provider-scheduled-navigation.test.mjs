import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('future scheduled acceptance opens agenda instead of an inactive job screen',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 assert.match(root,/ACTIONABLE_SCHEDULE_LEAD_MS=60\*60\*1000/)
 assert.match(root,/isFuture=scheduledAt!=null[\s\S]*scheduledAt>Date\.now\(\)\+ACTIONABLE_SCHEDULE_LEAD_MS/)
 assert.match(root,/alreadyWorking=Boolean\(data\.service&&\['asignado','en_camino','llegado','en_progreso'\]\.includes\(data\.service\.estado\)\)/)
 assert.match(root,/flow\.navigate\(alreadyWorking\|\|isFuture\?'agenda':'active-job'\)/)
})


test('passive waiting or dispute never hides a newly actionable assignment',async()=>{
 const service=await read('src/mvp/provider/providerService.ts')
 assert.match(service,/MISSION_SERVICE_STATES=new Set\(\['en_camino','llegado','en_progreso'\]\)/)
 assert.match(service,/PASSIVE_SERVICE_STATES=new Set\(\['esperando_aprobacion','disputado'\]\)/)
 const mission=service.indexOf('rows.find(service=>MISSION_SERVICE_STATES.has(service.estado))')
 const immediate=service.indexOf("rows.find(service=>service.estado==='asignado'&&!scheduleTime(service))")
 const scheduled=service.indexOf("rows.filter(service=>service.estado==='asignado')")
 const passive=service.indexOf('rows.find(service=>PASSIVE_SERVICE_STATES.has(service.estado))')
 assert.ok(mission>=0&&immediate>mission&&scheduled>immediate&&passive>scheduled)
})
