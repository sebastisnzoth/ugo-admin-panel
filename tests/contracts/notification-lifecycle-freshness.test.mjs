import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('foreground lifecycle alerts validate the current service state before ringing',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/SERVICE_NOTICE_EXPECTED_STATE/)
 assert.match(center,/from\('servicios'\)\.select\('id,estado'\)\.in\('id',serviceIds\)/)
 assert.match(center,/current!==expected/)
 assert.match(center,/actionable\.delete\(notice\.id\)/)
 assert.doesNotMatch(center,/event:'INSERT'[\s\S]{0,500}signalClientAlert\(notice\)/)
})

test('backend retires unread lifecycle alerts as soon as the service advances',async()=>{
 const sql=await read('supabase/migrations/20260925175500_notification_lifecycle_convergence.sql')
 assert.match(sql,/retire_superseded_service_notifications/)
 assert.match(sql,/before update of estado on public\.servicios/)
 assert.match(sql,/n\.datos->>'servicio_id'=new\.id::text/)
 assert.match(sql,/coalesce\(n\.datos->>'estado',''\)<>new\.estado::text/)
 assert.match(sql,/push_entregas/)
 assert.match(sql,/Backfill/)
})

test('web push refuses stale service lifecycle notifications and replaces older service banners',async()=>{
 const[dispatch,sw]=await Promise.all([read('supabase/functions/push-dispatch/index.ts'),read('public/sw.js')])
 assert.match(dispatch,/SERVICE_NOTICE_EXPECTED_STATE/)
 assert.match(dispatch,/currentState!==expectedServiceState/)
 assert.match(dispatch,/service notification stale/)
 assert.match(sw,/ugo-service-\$\{serviceId\}/)
})
