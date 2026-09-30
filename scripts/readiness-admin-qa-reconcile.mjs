import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data,error}=await db.rpc('autonomous_reconcile_quality_coverage')
if(error)throw error
if(!data?.id||data?.status!=='SUCCEEDED'||data?.verification_result?.passed!==true)throw new Error('QA_COVERAGE_RECONCILE_UNVERIFIED')
console.log(JSON.stringify({qaCoverageReconciled:true,jobId:data.id,correlationId:data.correlation_id,status:data.status,verification:data.verification_result}))

const protectedKeys=['physical-gps-device','uploaded-media-bytes','real-customer-acceptance']
const {data:protectedRows,error:protectedError}=await db.from('autonomous_quality_coverage').select('coverage_key,status').in('coverage_key',protectedKeys)
if(protectedError)throw protectedError
const bad=(protectedRows||[]).filter(row=>row.status==='COVERED')
if(bad.length)throw new Error('QA_COVERAGE_RECONCILE_DID_NOT_FAIL_CLOSE:'+bad.map(x=>x.coverage_key).join(','))
console.log(JSON.stringify({protectedCoverageFailClosed:true,rows:(protectedRows||[]).map(x=>({coverage_key:x.coverage_key,status:x.status}))}))
