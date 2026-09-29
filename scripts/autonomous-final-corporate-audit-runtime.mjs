import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data,error}=await db.rpc('autonomous_run_final_corporate_audit')
if(error)throw error
if(!data||data.control_key!=='corporate-final-audit')throw new Error('FINAL_CORPORATE_AUDIT_MISSING')
const blockers=(data.evidence_refs||[]).flatMap(x=>x&&typeof x==='object'&&Array.isArray(x.blockers)?x.blockers:[])
const expected=['FOUNDER_CHALLENGE_PENDING','PHYSICAL_GPS_DEVICE_UNVERIFIED','REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED']
for(const key of expected)if(!blockers.includes(key))throw new Error('FINAL_AUDIT_EXPECTED_BLOCKER_MISSING:'+key)
if(data.status!=='BLOCKED')throw new Error('FINAL_AUDIT_MUST_REMAIN_BLOCKED')
console.log(JSON.stringify({finalCorporateAudit:true,status:data.status,blockers}))
