import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')

// Trigger proof after scheduler resources are quiet.
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const correlationId=process.env.UGO_EXCEPTION_RECOVERY_CORRELATION_ID||randomUUID()
const {data,error}=await db.rpc('autonomous_execute_exception_recovery',{p_correlation_id:correlationId})
if(error)throw error
if(data?.passed!==true||data?.incident_status!=='resolved'||data?.job_status!=='SUCCEEDED'||data?.final_mode!=='OFF'||data?.production_touched!==false)throw new Error('EXCEPTION_RECOVERY_RUNTIME_FAILED')
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`UGO_EXCEPTION_RECOVERY_CORRELATION_ID=${correlationId}\n`)
console.log(JSON.stringify(data))
