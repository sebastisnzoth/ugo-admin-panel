import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','Only UGO TEST is allowed')
assert.ok(key,'UGO TEST service role must be configured via protected environment')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const evidence=await db.from('autonomous_evidence_ledger')
  .select('evidence_type,evidence_hash,created_at', {count:'exact'})
  .or('evidence_hash.is.null,evidence_hash.eq.')
if(evidence.error)throw evidence.error

// Supabase/PostgREST returns a bounded page by default; read-only aggregate
// classification must not silently report an incomplete sample as a total.
const expected=evidence.count??0
let missing=0
const byType={}
const pageSize=1000
for(let start=0;start<expected;start+=pageSize){
  const page=await db.from('autonomous_evidence_ledger')
    .select('evidence_type,evidence_hash')
    .or('evidence_hash.is.null,evidence_hash.eq.')
    .order('id',{ascending:true})
    .range(start,start+pageSize-1)
  if(page.error)throw page.error
  for(const e of page.data||[]){
    missing++
    byType[e.evidence_type]=(byType[e.evidence_type]||0)+1
  }
}
assert.equal(missing,expected,'Pagination did not cover all hashless evidence')
console.log(JSON.stringify({environment:'UGO TEST',status:missing?'BLOCKED':'PASS',missing_hash:missing,by_type:byType}))
if(missing)process.exitCode=1
