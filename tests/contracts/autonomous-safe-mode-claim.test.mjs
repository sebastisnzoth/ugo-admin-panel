import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('SAFE_MODE claims only explicitly safe enabled capabilities',async()=>{
 const sql=await read('supabase/migrations/20261002124500_autonomous_claim_safe_mode.sql')
 assert.match(sql,/m not in \('ON','SAFE_MODE'\)/)
 assert.match(sql,/c\.safe_mode_allowed/)
 assert.match(sql,/c\.enabled/)
 assert.match(sql,/c\.department_id=j\.department_id/)
 assert.match(sql,/c\.authority_class=j\.authority_class/)
})

test('claim still respects global department agent and capability kill switches',async()=>{
 const sql=await read('supabase/migrations/20261002124500_autonomous_claim_safe_mode.sql')
 for(const scope of ["GLOBAL","DEPARTMENT","AGENT","CAPABILITY"])assert.match(sql,new RegExp("scope_type='"+scope+"'"))
})
