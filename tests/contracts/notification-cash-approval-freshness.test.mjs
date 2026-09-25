import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('cash work approval remains actionable while service waits for client cash confirmation',async()=>{
 const[center,edge,sql]=await Promise.all([read('src/mvp/NotificationCenter.tsx'),read('supabase/functions/push-dispatch/index.ts'),read('supabase/migrations/20260925181000_notification_expected_state_fix.sql')])
 assert.match(center,/trabajo_aprobado:'esperando_aprobacion'/)
 assert.match(edge,/trabajo_aprobado:'esperando_aprobacion'/)
 assert.match(sql,/when 'trabajo_aprobado' then 'esperando_aprobacion'/)
})
