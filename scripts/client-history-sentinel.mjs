import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-history-runtime.json','utf8'))
const source=await fs.readFile('src/mvp/ServiceHistoryPanel.tsx','utf8')
assert.equal(p.sha,sha)
assert.equal(p.result,'PASS')
assert.match(source,/pago:pagos\(estado,metodo,monto_bruto\)/)
assert.match(source,/resenas\(puntuacion,comentario,autor_tipo\)/)
assert.match(source,/TU CALIFICACIÓN/)
assert.match(source,/CALIFICACIÓN RECIBIDA/)
assert.match(source,/ClientEvidenceGallery/)
assert.equal(p.assertions.payment_visible_and_concordant,true)
assert.equal(p.assertions.client_rating_visible_and_concordant,true)
assert.equal(p.assertions.provider_rating_visible_and_concordant,true)
assert.equal(p.assertions.authorized_photo_visible,true)
const out={validator:'Sentinel',result:'PASS',readiness_id:'client-history',sha,service_id:p.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-history-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
