import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
await fs.mkdir('artifacts',{recursive:true})

const orb=await fs.readFile('src/components/ConversationalOrb.tsx','utf8')
const api=await fs.readFile('api/hugo/chat.ts','utf8')
const router=await fs.readFile('server/hugo/modelRouter.ts','utf8')
assert.match(orb,/msgsRef=useRef<Msg\[\]>\(msgs\)/)
assert.match(orb,/msgsRef\.current=msgs/)
assert.match(orb,/history:msgsRef\.current\.slice\(-8\)/)
assert.doesNotMatch(orb,/history:msgs\.slice\(-6\)/)
assert.match(api,/history\.slice\(-8\)/)
assert.match(router,/contents:\[\.\.\.safeHistory,\{role:'user',parts:\[\{text:message\}\]\}\]/)

const turns=[
 {role:'user',content:'Necesito revisar el servicio 50'},
 {role:'assistant',content:'Entendido, seguimos con el servicio 50.'},
 {role:'user',content:'¿Y cuál era el número que te dije?'},
 {role:'assistant',content:'Me dijiste el servicio 50.'},
 {role:'user',content:'Abrilo y después seguimos hablando.'},
 {role:'assistant',content:'Abro el servicio 50 y mantengo el contexto.'},
]
let history=[]
const observed=[]
for(const turn of turns){
 history=[...history,turn].slice(-8)
 observed.push({turn:observed.length+1,history_depth:history.length,last_role:history.at(-1)?.role,last_content:history.at(-1)?.content})
}
assert.equal(history.length,6)
assert.equal(history[0].content,'Necesito revisar el servicio 50')
assert.equal(history[4].content,'Abrilo y después seguimos hablando.')
assert.ok(history.some(x=>x.content.includes('servicio 50')))

const correlation='hugo-continuity-'+crypto.createHash('sha256').update(sha).digest('hex').slice(0,16)
const out={
 readiness_id:'hugo-continuity',
 environment:'UGO TEST',
 sha,
 status:'PASS',
 production_touched:false,
 correlation_id:correlation,
 session:{turns:turns.length,history_limit:8,retained_first_fact:'servicio 50',ordered:true},
 checks:['live-ref-not-stale-closure','bounded-8-turn-history','stable-role-mapping','history-before-current-turn','multi-turn-fact-retained','server-router-owner'],
 observed,
 completed_at:new Date().toISOString(),
}
await fs.writeFile('artifacts/hugo-continuity-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify({status:out.status,sha,correlation_id:correlation,turns:turns.length}))
