import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider profile settings start compact and use shared actions',async()=>{const src=await read('src/mvp/provider/ProviderProfile.tsx');assert.doesNotMatch(src,/className="provider-setting" open/);assert.match(src,/onClick=\{openZoneEditor\}>Editar zona y tarifa<\/Button>/);assert.match(src,/Administrar fondos<\/Button>/);assert.match(src,/Abrir soporte de un servicio<\/Button>/)})


test('provider profile can capture a base location and online activation requires fresh GPS', async () => {
  const profile = await read('src/mvp/provider/ProviderProfile.tsx')
  const data = await read('src/mvp/provider/providerData.tsx')
  const service = await read('src/mvp/provider/providerService.ts')
  assert.match(profile, /Usar mi ubicación actual/)
  assert.match(profile, /Sin una posición reciente UGO no puede incluirte en el matching/)
  assert.match(data, /saveProviderBaseLocation/)
  assert.match(service, /activar_disponibilidad_proveedor/)
  assert.match(service, /guardar_ubicacion_base_proveedor/)
})


test('provider zone editor persists city radius rate and exposes location refresh inline',async()=>{const src=await read('src/mvp/provider/ProviderProfile.tsx');assert.match(src,/const saveZone=/);assert.match(src,/provider-zone-editor/);assert.match(src,/Guardar zona y tarifa/);assert.match(src,/Actualizar mi ubicación/);assert.match(src,/ciudad_base:ciudad/);assert.match(src,/zona_radio_km:radio/);assert.match(src,/tarifa_base:tarifa/);assert.match(src,/cancelZoneEditor/);assert.doesNotMatch(src,/onClick=\{\(\)=>setEditing\(true\)\}>Editar zona y tarifa/)});
