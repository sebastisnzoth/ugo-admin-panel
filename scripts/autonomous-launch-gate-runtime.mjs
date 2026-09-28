import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const url=process.env.UGO_TEST_SUPABASE_URL||'';
const key=process.env.UGO_TEST_SUPABASE_ANON_KEY||'';
const email=process.env.UGO_TEST_ADMIN_EMAIL||'';
const password=process.env.UGO_TEST_ADMIN_PASSWORD||'';
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','UGO_TEST_ONLY');
assert.ok(key&&email&&password,'UGO_TEST_SUPERADMIN_CREDENTIALS_REQUIRED');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
try{
 const {data:login,error:loginError}=await db.auth.signInWithPassword({email,password});
 if(loginError||!login.user)throw new Error('UGO_TEST_SUPERADMIN_LOGIN_FAILED');
 const {data:profile,error:profileError}=await db.from('usuarios').select('tipo').eq('id',login.user.id).single();
 if(profileError||profile?.tipo!=='superadmin')throw new Error('UGO_TEST_SUPERADMIN_REQUIRED');
 const {data:gate,error}=await db.rpc('superadmin_evaluate_release_gate',{p_gate_key:'CUSTOMER_1'});
 if(error||!gate)throw new Error('UGO_TEST_GATE_EVALUATION_FAILED:'+String(error?.code||'NO_RESULT'));
 const {data:acceptance,error:acceptanceError}=await db.from('development_checklist').select('code,status').in('code',['FULL-E2E','TWO-DEVICES']);
 if(acceptanceError)throw new Error('UGO_TEST_ACCEPTANCE_READ_FAILED');
 const approved=['FULL-E2E','TWO-DEVICES'].every(code=>acceptance?.some(item=>item.code===code&&item.status==='approved'));
 if(!approved){
   assert.equal(gate.status,'BLOCKED','UNAPPROVED_CUSTOMER_GATE_MUST_BLOCK');
   assert.ok(gate.blockers?.includes('CUSTOMER_ACCEPTANCE_NOT_APPROVED'),'CUSTOMER_ACCEPTANCE_BLOCKER_REQUIRED');
 }
 console.log(JSON.stringify({gate:gate.status,blockers:gate.blockers,acceptanceApproved:approved,environment:'UGO TEST'}));
}finally{await db.auth.signOut();}
