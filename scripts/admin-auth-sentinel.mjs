import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const gate=await fs.readFile('src/mvp/AdminGate.tsx','utf8')
const guard=await fs.readFile('supabase/migrations/20260916094000_usuarios_privilege_escalation_guard.sql','utf8')
const project=await fs.readFile('src/lib/supabaseProject.ts','utf8')
assert.match(gate,/\['admin','superadmin'\]\.includes\(profile\.tipo\)/)
assert.match(gate,/profile\.activo/)
assert.match(gate,/Acceso denegado/)
assert.match(guard,/SUPERADMIN_REQUIRED_FOR_PRIVILEGED_ACCOUNT/)
assert.match(guard,/USER_SENSITIVE_FIELDS_ADMIN_ONLY/)
assert.match(project,/tmossnqfwfwjrtzwcbmm/)
assert.doesNotMatch(project,/trfsjuseqjxlhrxuvdsm/)
const evidence={validator:'Sentinel',readiness_id:'admin-auth',sha:process.env.UGO_RUNTIME_SHA||'',result:'PASS',checks:['active-role-gate','privilege-escalation-guard','test-only-target'],validated_at:new Date().toISOString()}
await fs.writeFile('artifacts/admin-auth-sentinel.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
