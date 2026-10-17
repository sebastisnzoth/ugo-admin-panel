import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client order policy permits three independent immediate orders and scheduled coexistence',async()=>{
  const [migration,flow]=await Promise.all([
    read('supabase/migrations/20261017064000_client_three_parallel_immediate_orders.sql'),
    read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  ])

  assert.match(migration,/guard_client_immediate_order_concurrency/)
  assert.match(migration,/new\.programado_para is not null then\s+return new/)
  assert.match(migration,/s\.programado_para is null/)
  assert.match(migration,/v_count>=3/)
  assert.match(migration,/pg_advisory_xact_lock/)
  assert.match(migration,/security invoker/i)
  assert.match(migration,/revoke execute on function private\.guard_client_immediate_order_concurrency\(\) from public, anon, authenticated/i)

  assert.match(flow,/if\(!row&&!draft\.scheduleAt\)/)
  assert.match(flow,/\.is\('programado_para',null\)/)
  assert.match(flow,/hasta 3 pedidos inmediatos activos/)
  assert.match(flow,/if\(!row\)\{/)
  assert.match(flow,/programado_para:draft\.scheduleAt\?new Date\(draft\.scheduleAt\)\.toISOString\(\):null/)
})

test('client home distinguishes scheduled active orders',async()=>{
  const home=await read('src/features/client/home/ClientHomeScreen.tsx')
  assert.match(home,/programado_para/)
  assert.match(home,/scheduledLabel/)
  assert.match(home,/Programado ·/)
})
