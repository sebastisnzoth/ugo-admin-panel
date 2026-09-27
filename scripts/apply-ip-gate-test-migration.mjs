import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes(TEST_REF)||url.includes(PROD_REF))throw new Error('Refusing IP migration outside designated UGO TEST')
if(!key)throw new Error('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY required')
const sql=fs.readFileSync('supabase/migrations/20260927223000_ip_corporate_protection_gate.sql','utf8')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {error}=await db.rpc('exec_sql',{sql_text:sql})
if(error){
  if(/function public\.exec_sql|schema cache|Could not find/i.test(error.message||'')){
    throw new Error('UGO TEST has no approved exec_sql migration RPC; apply migration through existing Supabase migration channel')
  }
  throw error
}
console.log('UGO TEST IP Gate migration applied without exposing credentials')
