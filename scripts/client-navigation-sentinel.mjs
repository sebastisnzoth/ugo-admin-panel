import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-navigation-runtime.json','utf8'))
const menu=await fs.readFile('src/features/client/ui/ClientGlobalMenu.tsx','utf8')
const header=await fs.readFile('src/features/client/ui/ClientPersistentHeader.tsx','utf8')
const nav=await fs.readFile('src/features/client/navigation/useClientRootNavigation.ts','utf8')
for(const token of ['Inicio','Pedir servicio','Servicios y categorías','Actividad y pedidos','Direcciones','Formas de pago','Notificaciones','Hugo / Asistente IA','Ayuda y soporte','Configuración','Cerrar sesión'])assert.ok(menu.includes(token),'static menu contract missing: '+token)
for(const token of ['Abrir menú','Ir al inicio'])assert.ok(header.includes(token),'header navigation contract missing: '+token)
for(const token of ['openService','closeService','goHome','openNotice'])assert.ok(nav.includes(token),'root navigation contract missing: '+token)
assert.equal(p.sha,sha)
const counts=new Map();for(const entry of p.click_map)counts.set(entry.control,(counts.get(entry.control)||0)+1);assert.ok([...counts.values()].every(count=>count<=2),'unexpected duplicate click-map entry beyond desktop/mobile coverage')
assert.ok(p.views.every(v=>v.buttons>=1),'empty interactive view')
assert.equal(p.page_errors.length,0)
const out={validator:'Sentinel',result:'PASS',sha,readiness_id:p.readiness_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-navigation-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
