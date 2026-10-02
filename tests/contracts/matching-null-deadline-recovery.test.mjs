import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('matching states with no deadline are recoverable instead of searching forever',async()=>{
 const[home,detail,post]=await Promise.all([
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/features/client/request/ClientPostConfirmFlow.tsx')
 ])
 assert.match(home,/missingDeadline=matching&&deadline===null/)
 assert.match(home,/expired=matching&&\(missingDeadline\|\|remaining<=0\)/)
 assert.match(detail,/matchingExpired=matchingState&&\(matchingDeadlineMs===null\|\|remainingMs<=0\)/)
 assert.match(post,/expired=matchingState&&\(deadlineMs===null\|\|remainingMs<=0\)/)
 assert.match(post,/Búsqueda detenida/)
})

test('database backfills stale searching rows with a deadline without assigning providers',async()=>{
 const sql=await read('supabase/migrations/20261002104500_recover_null_matching_deadline.sql')
 assert.match(sql,/estado in \('buscando','ofrecido'\)/)
 assert.match(sql,/proveedor_id is null/)
 assert.match(sql,/matching_expires_at is null/)
 assert.match(sql,/coalesce\(updated_at,created_at,clock_timestamp\(\)\) \+ interval '5 minutes'/)
 assert.doesNotMatch(sql,/set\s+proveedor_id/i)
})
