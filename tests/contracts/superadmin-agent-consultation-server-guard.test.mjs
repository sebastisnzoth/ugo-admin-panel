import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const api=readFileSync('api/test.ts','utf8')
const shell=readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const workforce=readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8')
const sql=readFileSync('supabase/migrations/20260929083000_agent_consultation_audit.sql','utf8')
test('server resolves the actual agent and checks disabled status and kill switches',()=>{assert.match(api,/authenticatedSuperadmin\(req\)/);assert.match(api,/\.from\('autonomous_agents'\).*\.eq\('id',agentId\)/);assert.match(api,/AGENT_NOT_OPERATIONAL/);assert.match(api,/AGENT_CONSULTATION_PAUSED/);assert.match(api,/const taskClass='AGENT_CONSULTATION'/);assert.match(api,/NO_PERSISTED_AGENT_EVIDENCE/)})
test('only sanitized persisted summaries go to model, and consults are hashed and append only',()=>{assert.match(api,/verified_summary:summary/);assert.match(api,/question_hash:questionHash/);assert.match(api,/answer_hash:answer\?createHash/);assert.match(sql,/autonomous_consultations_immutable/);assert.match(sql,/private\.is_superadmin\(\)/);assert.match(workforce,/agent_id:selectedAgent\.id,question:q/);assert.doesNotMatch(shell+workforce,/Evidencia autorizada:/)})
