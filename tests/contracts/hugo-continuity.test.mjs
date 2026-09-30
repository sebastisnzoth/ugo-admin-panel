import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin Hugo browser fallback sends live multi-turn history instead of a stale closure',async()=>{
 const orb=await read('src/components/ConversationalOrb.tsx')
 assert.match(orb,/msgsRef=useRef<Msg\[\]>\(msgs\)/)
 assert.match(orb,/msgsRef\.current=msgs/)
 assert.match(orb,/history:msgsRef\.current\.slice\(-8\)/)
 assert.doesNotMatch(orb,/history:msgs\.slice\(-6\)/)
})

test('Hugo model router keeps a bounded recent conversation window and stable role mapping',async()=>{
 const [api,router]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/modelRouter.ts')])
 assert.match(api,/history\.slice\(-8\)/)
 assert.match(api,/sanitizeForModel\(m\.content,1200\)/)
 assert.match(router,/history\.slice\(-8\)/)
 assert.match(router,/m\.role==='assistant'\?'model':'user'/)
})

test('Hugo continuity keeps prior turns in-order before the new user turn',async()=>{
 const router=await read('server/hugo/modelRouter.ts')
 assert.match(router,/contents:\[\.\.\.safeHistory,\{role:'user',parts:\[\{text:message\}\]\}\]/)
})
