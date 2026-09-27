import test from'node:test'
import assert from'node:assert/strict'
import{getHugoCapabilities,validateHugoCapability}from'../src/hugoCapabilities.js'

test('client exposes only implemented Hugo MCP actions as executable',()=>{
 const c=getHugoCapabilities({role:'client'})
 assert.ok(c.actions.includes('ugo_approve_work'))
 assert.ok(c.actions.includes('ugo_create_service_request'))
 assert.equal(validateHugoCapability({role:'client',tool:'ugo_create_service_request'}).allowed,true)
 assert.equal(validateHugoCapability({role:'client',tool:'create_request'}).code,'capability_not_available')
})

test('provider cannot execute an admin or pending capability',()=>{
 assert.equal(validateHugoCapability({role:'provider',tool:'open_dispute'}).allowed,false)
 assert.equal(validateHugoCapability({role:'provider',tool:'publish_location'}).code,'capability_not_available')
 assert.equal(validateHugoCapability({role:'provider',tool:'ugo_mark_arrived'}).allowed,true)
})

test('admin has no executable MCP capability until a real adapter exists',()=>{
 const c=getHugoCapabilities({role:'admin'})
 assert.deepEqual(c.actions,[])
 assert.deepEqual(c.reads,[])
 assert.equal(validateHugoCapability({role:'admin',tool:'show_operational_status'}).code,'capability_not_available')
})
