import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const sql=fs.readFileSync('supabase/migrations/20260928002000_autonomous_safe_execution.sql','utf8')
test('safe executor requires ON mode and uses skip locked leases',()=>{assert.match(sql,/m<>'ON'/);assert.match(sql,/for update skip locked/);assert.match(sql,/lease_expires_at/);assert.match(sql,/attempt_count/)})
test('data quality gate blocks untrusted jobs and completion',()=>{assert.match(sql,/DATA_UNTRUSTED/);assert.match(sql,/data_quality_status/);assert.match(sql,/if v\.data_quality_status<>'TRUSTED'/)})
test('job lifecycle RPCs are Super Admin guarded',()=>{assert.ok((sql.match(/private\.is_superadmin\(\)/g)||[]).length>=3);for(const fn of ['autonomous_claim_job','autonomous_set_data_quality','autonomous_complete_job'])assert.match(sql,new RegExp('revoke all on function public\\.'+fn))})
