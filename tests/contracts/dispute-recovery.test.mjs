import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/hooks/useDisputes.ts',import.meta.url),'utf8')

test('participant dispute client is stable across renders',()=>{
 assert.match(source,/useMemo\(\(\)=>getRoleSupabase\(role\)/)
})

test('participant disputes rehydrate after realtime reconnect, online and visibility recovery',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('ambiguous dispute open reconciles persisted case before surfacing rpc failure',()=>{
 assert.match(source,/abrir_disputa[\s\S]*if\(error\)\{await load\(\);throw error\}/)
})

test('ambiguous dispute reply reconciles persisted thread before surfacing rpc failure',()=>{
 assert.match(source,/responder_disputa[\s\S]*if\(error\)\{await load\(\);throw error\}/)
})
