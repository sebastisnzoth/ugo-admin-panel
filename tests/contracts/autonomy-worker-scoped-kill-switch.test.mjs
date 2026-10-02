import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('scheduled worker proof blocks only a GLOBAL kill switch and preserves scoped containment',async()=>{
 const sql=await read('supabase/migrations/20261002123000_scheduled_worker_scoped_kill_switch.sql')
 assert.match(sql,/scope_type='GLOBAL'/)
 assert.match(sql,/GLOBAL_KILL_SWITCH_PRESENT/)
 assert.doesNotMatch(sql,/where enabled=true\) then\n    raise exception 'ACTIVE_KILL_SWITCH_PRESENT'/)
})

test('scheduled worker proof validates the actual initial autonomy mode instead of forcing OFF',async()=>{
 const script=await read('scripts/autonomous-scheduled-worker-on-proof.mjs')
 assert.match(script,/assert\.equal\(data\?\.finalMode,data\?\.initialMode\)/)
 assert.match(script,/assert\.equal\(safe\.mode,data\.initialMode\)/)
 assert.doesNotMatch(script,/assert\.equal\(safe\.mode,'OFF'\)/)
})
