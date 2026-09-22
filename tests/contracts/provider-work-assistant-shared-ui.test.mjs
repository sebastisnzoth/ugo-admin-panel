import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider work assistant uses shared UI without changing state guidance',async()=>{const s=await read('src/mvp/provider/ProviderWorkAssistant.tsx');assert.match(s,/Card,StatusPill/);assert.match(s,/<Card className=/);assert.match(s,/<StatusPill/);for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion'])assert.match(s,new RegExp("service\\.estado==='"+state+"'"));assert.match(s,/initialEvidence/);assert.match(s,/finalEvidence/);assert.match(s,/cashSelected&&!cashConfirmed/);assert.match(s,/Hugo no modifica pagos, estados ni alcance/)})
