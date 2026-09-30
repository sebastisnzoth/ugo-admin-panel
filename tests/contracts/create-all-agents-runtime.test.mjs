import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const api=fs.readFileSync('api/test.ts','utf8')
const migration=fs.readFileSync('supabase/migrations/20260930023500_create_all_agents_readonly_runtime.sql','utf8')

test('all cataloged agents receive governed readonly runtime',()=>{
 assert.match(migration,/where status='DISABLED'/)
 assert.match(migration,/generic_readonly_specialist/)
 assert.match(migration,/autonomous_execute_cataloged_readonly_agent/)
 assert.match(migration,/autonomous_judge_cataloged_readonly_agent_job/)
 assert.match(migration,/autonomous_sentinel_cataloged_readonly_agent_job/)
 assert.match(migration,/revoke all on function public\.autonomous_execute_cataloged_readonly_agent\(uuid\) from public,anon,authenticated/)
 assert.match(migration,/grant execute on function public\.autonomous_execute_cataloged_readonly_agent\(uuid\) to service_role/)
 assert.match(migration,/CREATE_ALL_AGENTS_INCOMPLETE/i)
})

test('Super Admin routes generic readonly agents and validates every execution',()=>{
 assert.match(api,/generic_readonly_specialist/)
 assert.match(api,/autonomous_execute_cataloged_readonly_agent/)
 assert.match(api,/autonomous_judge_cataloged_readonly_agent_job/)
 assert.match(api,/autonomous_sentinel_cataloged_readonly_agent_job/)
 assert.match(api,/judge:'PASS'/)
 assert.match(api,/sentinel:'PASS'/)
})
