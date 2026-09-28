import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm.supabase.co'))throw new Error('SENTINEL_TEST_GUARD_FAILED')
if(!key)throw new Error('SENTINEL_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const one=async(q,label)=>{const{data,error}=await q;if(error)throw new Error(label+': '+error.message);return data}
const state=await one(db.from('autonomous_company_state').select('mode').eq('singleton',true).single(),'state')
if(state.mode!=='OFF')throw new Error('SENTINEL_UNSAFE_AUTONOMY mode='+state.mode)
const d14=await one(db.from('autonomous_agents').select('agent_key,status').eq('department_id',14),'d14')
const canonical=['internal-auditor','enterprise-risk-officer','internal-control-inspector','cross-department-auditor','ai-governance-auditor','executive-assurance-challenge']
const active=d14.filter(x=>x.status!=='DISABLED').map(x=>x.agent_key).sort()
if(JSON.stringify(active)!==JSON.stringify([...canonical].sort()))throw new Error('SENTINEL_D14_CANONICAL_MISMATCH')
const legacy=d14.find(x=>x.agent_key==='corporate-audit-agent')
if(legacy?.status!=='DISABLED')throw new Error('SENTINEL_LEGACY_AUDITOR_NOT_DISABLED')
const running=await one(db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('status','RUNNING'),'jobs')
if((running?.length||0)>0)throw new Error('SENTINEL_RUNNING_JOBS')
const{count:activeLeases,error:leaseError}=await db.from('autonomous_jobs').select('id',{count:'exact',head:true}).not('lease_owner','is',null).gt('lease_expires_at',new Date().toISOString())
if(leaseError)throw leaseError
if(activeLeases)throw new Error('SENTINEL_ACTIVE_LEASES count='+activeLeases)
const{count:killCount,error:killError}=await db.from('autonomous_kill_switches').select('id',{count:'exact',head:true}).eq('enabled',true)
if(killError)throw killError
if(killCount)throw new Error('SENTINEL_ACTIVE_KILL_SWITCHES count='+killCount)
const gate=await one(db.from('autonomous_release_gate').select('status,blockers,meta_qa_validated').eq('gate_key','CUSTOMER_1').single(),'gate')
if(!gate.meta_qa_validated)throw new Error('SENTINEL_META_QA_NOT_VALIDATED')
if(gate.status==='READY'&&(gate.blockers||[]).length)throw new Error('SENTINEL_FALSE_READY')
console.log(JSON.stringify({sentinel:'PASS',environment:'UGO TEST',autonomy:state.mode,d14Canonical:canonical.length,activeLeases:0,activeKillSwitches:0,launchGate:gate.status,blockers:gate.blockers||[],metaQa:true}))
