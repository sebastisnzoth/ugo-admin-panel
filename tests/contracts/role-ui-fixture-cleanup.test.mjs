import assert from 'node:assert/strict'
import test from 'node:test'
import {createRoleUiFixtures} from '../../scripts/role-ui-fixtures.mjs'

function fakeTestDb({authDeleteTimeoutOnce=false,profileVerifyTimeoutOnce=false,profileDeleteForbidden=false,authVerifyAlwaysTimeout=false}={}){
 const authUsers=new Set(),profiles=new Set(),authDeleteAttempts=new Map(),profileReadAttempts=new Map()
 let nextId=0
 const db={
  from(table){
   return {
    async upsert(row){if(table==='usuarios')profiles.add(row.id);return {error:null}},
    delete(){return {async eq(_column,id){
     if(table!=='usuarios')throw new Error('unexpected delete '+table)
     if(profileDeleteForbidden)return {error:{status:403,message:'Forbidden'}}
     profiles.delete(id)
     return {error:null}
    }}},
    select(){return {async eq(_column,id){
     if(table!=='usuarios')throw new Error('unexpected select '+table)
     const attempt=(profileReadAttempts.get(id)||0)+1
     profileReadAttempts.set(id,attempt)
     if(profileVerifyTimeoutOnce&&attempt===1)return {data:null,error:{status:504,message:'Gateway Timeout'}}
     return {data:profiles.has(id)?[{id}]:[],error:null}
    }}},
   }
  },
  auth:{admin:{
   async createUser(){
    const id='test-user-'+(++nextId)
    authUsers.add(id)
    return {data:{user:{id}},error:null}
   },
   async deleteUser(id){
    const attempt=(authDeleteAttempts.get(id)||0)+1
    authDeleteAttempts.set(id,attempt)
    if(authDeleteTimeoutOnce&&attempt===1)return {error:{status:504,message:'Gateway Timeout'}}
    authUsers.delete(id)
    return {error:null}
   },
   async getUserById(id){
    if(authVerifyAlwaysTimeout)return {data:null,error:{status:504,message:'Gateway Timeout'}}
    return authUsers.has(id)?{data:{user:{id}},error:null}:{data:{user:null},error:{status:404,message:'User not found'}}
   },
  }},
 }
 return {db,authUsers,profiles,authDeleteAttempts}
}

test('cross-role cleanup retries transient Auth 504 and verifies no orphaned users',async()=>{
 const {db,authUsers,profiles,authDeleteAttempts}=fakeTestDb({authDeleteTimeoutOnce:true})
 const fixtures=await createRoleUiFixtures(db,'a0434291')
 await fixtures.cleanup()
 assert.equal(authUsers.size,0)
 assert.equal(profiles.size,0)
 assert.ok([...authDeleteAttempts.values()].every(attempts=>attempts===2))
})

test('cross-role cleanup retries transient profile verification 504',async()=>{
 const {db,authUsers,profiles}=fakeTestDb({profileVerifyTimeoutOnce:true})
 const fixtures=await createRoleUiFixtures(db,'a0434291')
 await fixtures.cleanup()
 assert.equal(authUsers.size,0)
 assert.equal(profiles.size,0)
})

test('cross-role cleanup fails closed on permanent profile permission errors',async()=>{
 const {db,profiles}=fakeTestDb({profileDeleteForbidden:true})
 const fixtures=await createRoleUiFixtures(db,'a0434291')
 await assert.rejects(fixtures.cleanup(),/ROLE_UI_FIXTURE_CLEANUP_FAILED/)
 assert.equal(profiles.size,4)
})

test('cross-role cleanup never treats Auth verification timeout as absence',async()=>{
 const {db}=fakeTestDb({authVerifyAlwaysTimeout:true})
 const fixtures=await createRoleUiFixtures(db,'a0434291')
 await assert.rejects(fixtures.cleanup(),/ROLE_UI_FIXTURE_CLEANUP_FAILED/)
})
