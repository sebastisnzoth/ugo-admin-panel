import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('notification clicks revalidate stale provider offers before navigation',async()=>{
 const src=await read('src/mvp/NotificationCenter.tsx')
 assert.match(src,/noticeStillActionable/)
 assert.match(src,/role==='provider'&&notice\.tipo==='nueva_oferta'&&!providerOfferNoticeActive\(notice\)/)
 assert.match(src,/Esta oferta ya venció/)
 assert.match(src,/if\(!actionable\.ok\)/)
 assert.match(src,/onOpenNotice\?\.\(notice\)/)
})

test('state-bound service notifications fail closed when persisted state has changed',async()=>{
 const src=await read('src/mvp/NotificationCenter.tsx')
 assert.match(src,/SERVICE_NOTICE_EXPECTED_STATE\[notice\.tipo\]/)
 assert.match(src,/from\('servicios'\)\.select\('estado'\)\.eq\('id',serviceId\)\.maybeSingle\(\)/)
 assert.match(src,/String\(data\.estado\)!==expected/)
 assert.match(src,/El servicio ya cambió de estado/)
 assert.match(src,/No pudimos validar el estado actual del servicio/)
})
