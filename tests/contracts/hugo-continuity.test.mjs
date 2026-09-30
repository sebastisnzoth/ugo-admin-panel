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

test('Hugo API keeps a bounded recent conversation window and stable role mapping',async()=>{
 const api=await read('api/hugo/chat.ts')
 assert.match(api,/history\.slice\(-8\)/)
 assert.match(api,/m\.role==='assistant'\?'model':'user'/)
 assert.match(api,/sanitizeForModel\(m\.content,1200\)/)
})

test('Hugo continuity keeps prior turns in-order before the new user turn',async()=>{
 const api=await read('api/hugo/chat.ts')
 assert.match(api,/contents:\[\.\.\.safeHistory,\{role:'user',parts:\[\{text:safeMessage\}\]\}\]/)
})
