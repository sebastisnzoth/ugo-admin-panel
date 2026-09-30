import assert from'node:assert/strict'
import fs from'node:fs'
const e=JSON.parse(fs.readFileSync('artifacts/pilot-provider-runtime.json','utf8'));assert.equal(e.result,'PASS')
const marido=e.results.find(x=>x.kind==='marido'),faxina=e.results.find(x=>x.kind==='faxina');for(const key of ['tools','transport','materials','quoteMode','workLimits','certifications'])assert.ok(marido.capability_keys.includes(key));for(const key of ['products','equipment','restrictions'])assert.ok(faxina.capability_keys.includes(key))
console.log('PILOT PROVIDER SENTINEL PASS')
