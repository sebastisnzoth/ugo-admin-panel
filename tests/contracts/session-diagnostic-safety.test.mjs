import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source=fs.readFileSync('src/lib/roleSupabase.ts','utf8')
const start=source.indexOf('export type SessionDiagnosticOrigin')
const end=source.indexOf('export function getRoleSupabase',start)
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText

function diagnosticsSandbox(){
 const storage=new Map(),events=[]
 let clock=Date.now()
 class DiagnosticDate extends Date{static now(){return clock}}
 class CustomEventMock{constructor(type,init){this.type=type;this.detail=init.detail}}
 const window={sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},dispatchEvent:event=>events.push(event)}
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,window,CustomEvent:CustomEventMock,Date:DiagnosticDate,JSON,Number,String,Array,Error,RegExp})
 return{record:module.exports.recordSessionDiagnostic,storage,events,advance:()=>{clock+=6_000}}
}

test('session diagnostics persist categories, never raw errors or credential-like values',()=>{
 const app=diagnosticsSandbox()
 const secret='Bearer do-not-store provider@example.test user-123'
 app.record('provider','auth','session_check_failed',{error:new Error(`Network request failed: ${secret}`)})
 const stored=[...app.storage.values()][0]
 assert.ok(stored)
 assert.equal(stored.includes(secret),false)
 assert.equal(stored.includes('Network request failed'),false)
 const entries=JSON.parse(stored)
 assert.equal(entries.length,1)
 assert.equal(entries[0].role,'provider')
 assert.equal(entries[0].origin,'auth')
 assert.equal(entries[0].reason,'session_check_failed')
 assert.equal(entries[0].errorClass,'network')
 assert.equal(Object.hasOwn(entries[0],'error'),false)
 assert.equal(app.events[0].type,'ugo:session-diagnostic')
 assert.equal(Object.hasOwn(app.events[0].detail,'error'),false)
})

test('session diagnostics are bounded to the newest 100 entries',()=>{
 const app=diagnosticsSandbox()
 for(let index=0;index<125;index++){
  app.record('provider','realtime','realtime_channel_failed')
  app.advance()
 }
 const entries=JSON.parse([...app.storage.values()][0])
 assert.equal(entries.length,100)
 assert.equal(entries.every(entry=>entry.role==='provider'&&entry.origin==='realtime'&&entry.reason==='realtime_channel_failed'),true)
})
