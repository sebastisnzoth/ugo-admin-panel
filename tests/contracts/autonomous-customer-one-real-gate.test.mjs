import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../../supabase/migrations/20260929060000_autonomous_customer_one_real_gate.sql',import.meta.url),'utf8');
const acceptance=readFileSync(new URL('../../supabase/migrations/20260929061000_autonomous_customer_acceptance_proof.sql',import.meta.url),'utf8');
test('Customer #1 cannot be declared ready from synthetic QA services or empty coverage',()=>{
 assert.match(sql,/not exists\(select 1 from public\.autonomous_quality_coverage\)/);
 assert.match(sql,/p_gate_key='CUSTOMER_1'/);
 assert.match(sql,/s\.ambiente='real'/);
 assert.match(sql,/coalesce\(s\.metadata->>'qa_p0','false'\)<>'true'/);
 assert.match(sql,/REAL_CUSTOMER_JOURNEY_NOT_VERIFIED/);
 assert.match(sql,/s\.estado='completado'/);
 assert.match(sql,/count\(distinct autor_tipo\)/);
});
test('Customer #1 requires non-demo participants and independent acceptance',()=>{
 assert.match(acceptance,/c\.es_demo is not true/);
 assert.match(acceptance,/p\.es_demo is not true/);
 assert.match(acceptance,/FULL-E2E/);
 assert.match(acceptance,/TWO-DEVICES/);
 assert.match(acceptance,/d\.status='approved'/);
 assert.match(acceptance,/CUSTOMER_ACCEPTANCE_NOT_APPROVED/);
});
