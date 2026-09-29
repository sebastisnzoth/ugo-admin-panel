import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';const sql=fs.readFileSync('supabase/migrations/20260928170000_autonomous_job_resilience.sql','utf8');test('job engine has complete resilience controls',()=>{for(const x of['max_attempts','failure_reason','next_attempt_at','autonomous_renew_lease','autonomous_fail_job','autonomous_recover_stale_jobs','superadmin_cancel_autonomous_job','FOR UPDATE SKIP LOCKED'])assert.match(sql,new RegExp(x,'i'))});test('claim respects all kill switch scopes',()=>{for(const x of["scope_type='GLOBAL'","scope_type='DEPARTMENT'","scope_type='AGENT'","scope_type='CAPABILITY'"])assert.match(sql,new RegExp(x))});test('dead letter occurs at max attempts and RPCs require superadmin',()=>{assert.match(sql,/DEAD_LETTER/);assert.match(sql,/attempt_count>=max_attempts/);assert.ok((sql.match(/private\.is_superadmin\(\)/g)||[]).length>=5)});

test('executable autonomous jobs require a persisted agent owner',()=>{
 const sql=fs.readFileSync('supabase/migrations/20260929161500_autonomous_job_owner_integrity.sql','utf8')
 assert.match(sql,/AUTONOMOUS_AGENT_REQUIRED/)
 assert.match(sql,/new\.status in\('QUEUED','RUNNING','WAITING_APPROVAL'\)/)
 assert.match(sql,/trigger_type='TEST'/)
 assert.match(sql,/OWNER_INTEGRITY_REMEDIATION/)
})
