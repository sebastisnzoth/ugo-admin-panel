import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(`src/features/client/${p}`,'utf8')
test('order switcher loads only owned recent services and asks before switching',()=>{
 const s=read('order/ClientOrderSwitcher.tsx')
 assert.match(s,/auth\.getUser\(\)/)
 assert.match(s,/\.eq\('cliente_id',auth\.user\.id\)/)
 assert.match(s,/\.limit\(50\)/)
 assert.match(s,/await confirm\(/)
 assert.match(s,/if\(id===serviceId\)return/)
 assert.match(s,/onSelect\(id\)/)
 assert.match(s,/clientOrderSwitch\.error/)
})
test('switch remounts the exact selected service and its chat',()=>{
 const root=read('ClientRoot.tsx'),detail=read('order/ClientServiceDetail.tsx')
 assert.match(root,/key=\{selectedServiceId\} onSwitch=\{openService\}/)
 assert.match(detail,/ClientOrderSwitcher serviceId=\{service\.id\}/)
 assert.match(detail,/ServiceChat role="client" serviceId=\{service\.id\}/)
})
