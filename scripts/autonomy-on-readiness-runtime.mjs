import assert from'node:assert/strict'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','UGO_TEST_ONLY')
assert.ok(key,'UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})

const[{data:state,error:stateError},{data:gates,error:gateError},{count:running,error:runningError},{count:kills,error:killError}]=await Promise.all([
 db.from('autonomous_company_state').select('mode,reason,updated_at').eq('singleton',true).single(),
 db.from('autonomous_release_gate').select('gate_key,status,blockers,evaluated_at').in('gate_key',['AUTONOMY_ON','CUSTOMER_1']),
 db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING'),
 db.from('autonomous_kill_switches').select('id',{count:'exact',head:true}).eq('enabled',true)
])
if(stateError)throw stateError;if(gateError)throw gateError;if(runningError)throw runningError;if(killError)throw killError
const autonomy=(gates||[]).find(x=>x.gate_key==='AUTONOMY_ON'),customer=(gates||[]).find(x=>x.gate_key==='CUSTOMER_1')
assert.equal(state.mode,'ON')
assert.equal(autonomy?.status,'READY')
assert.deepEqual(autonomy?.blockers||[],[])
assert.equal(running,0)
assert.equal(kills,0)
assert.ok(customer,'CUSTOMER_1_GATE_REQUIRED')
console.log(JSON.stringify({autonomy:'ON',gate:'READY',runningJobs:0,activeKillSwitches:0,customer1:{status:customer.status,blockers:customer.blockers},productionTouched:false}))
