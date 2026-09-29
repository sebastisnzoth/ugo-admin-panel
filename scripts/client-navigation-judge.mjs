import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-navigation-runtime.json','utf8'))
assert.equal(p.readiness_id,'client-navigation')
assert.equal(p.task_id,'readiness-client-navigation')
assert.equal(p.sha,sha,'same-SHA runtime evidence required')
assert.equal(p.environment,'UGO TEST')
assert.equal(p.result,'PASS')
assert.deepEqual(p.page_errors,[])
assert.deepEqual(p.viewports,['desktop','mobile'])
for(const name of ['Inicio','Pedir servicio','Servicios y categorías','Actividad y pedidos','Direcciones','Formas de pago','Notificaciones','Hugo / Asistente IA','Ayuda y soporte','Configuración','Header Ir al inicio','Cerrar sesión'])assert.ok(p.click_map.some(x=>x.control===name||x.control.startsWith(name+' ')),name+' missing')
assert.ok(p.views.length>=20,'full responsive route crawl required')
const out={validator:'Judge',result:'PASS',sha,readiness_id:p.readiness_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-navigation-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
