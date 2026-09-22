import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Admin tower classifies operational stalls instead of showing a generic stale state',async()=>{const s=await read('src/mvp/AdminNativeModules.tsx');for(const marker of ['Sin proveedor','Proveedor en camino sin actualización','Esperando aprobación del cliente','pago pendiente','Asignado sin iniciar viaje','Proveedor llegó, trabajo sin iniciar','Trabajo en curso sin actualización'])assert.match(s,new RegExp(marker));assert.match(s,/metadata\?\.trabajo_aprobado_at/)})
