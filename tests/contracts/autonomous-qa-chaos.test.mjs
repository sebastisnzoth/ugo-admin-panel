import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260929011500_autonomous_qa_p0_coverage.sql','utf8');

test('P0 QA scenarios define executable fault expectations',()=>{
  for(const fault of ['payment_rpc_timeout','cash_ack_duplicate','realtime_disconnect','duplicate_event','out_of_order_event','cross_role_token','unauthorized_rpc']) assert.ok(sql.includes(fault),fault);
  for(const expected of ['no_double_ledger_entry','idempotent_recovery','persisted_state_wins','reconnect_converges','rls_denies','rpc_denies']) assert.ok(sql.includes(expected),expected);
});
