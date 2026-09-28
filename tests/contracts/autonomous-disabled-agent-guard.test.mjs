import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929080000_autonomous_job_agent_authority_guard.sql', 'utf8')

test('disabled catalog agents cannot be assigned executable jobs', () => {
  assert.match(sql, /agent\.status='DISABLED'/)
  assert.match(sql, /DISABLED_AGENT_CANNOT_EXECUTE/)
  assert.match(sql, /AUTONOMOUS_AGENT_DEPARTMENT_MISMATCH/)
  assert.match(sql, /before insert or update of agent_id,department_id,authority_class,status/)
})

test('new jobs cannot lower an agent authority class', () => {
  assert.match(sql, /AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE/)
  assert.match(sql, /when 'GREEN' then 1 when 'YELLOW' then 2 else 3/)
  assert.match(sql, /if tg_op='INSERT'/)
})
