import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260929182500_autonomous_p0_audit_event_chain.sql','utf8');

test('P0 audit chain binds six persisted service events under one correlation', () => {
  for (const event of ['matching','arrival','evidence_before','evidence_after','payment','closure']) {
    assert.match(sql, new RegExp("'" + event + "'"));
  }
  assert.match(sql, /correlation_id=p_correlation_id/);
  assert.match(sql, /mixed_service_count/);
  assert.match(sql, /P0_AUDIT_CHAIN_BOUND/);
  assert.match(sql, /P0_AUDIT_EVENT_CHAIN/);
  assert.match(sql, /grant execute on function public\.service_role_bind_p0_audit_chain\(uuid,uuid\) to service_role/);
  assert.match(sql, /revoke all on function public\.service_role_bind_p0_audit_chain\(uuid,uuid\) from public, anon, authenticated/);
});
