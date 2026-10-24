import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source=fs.readFileSync('src/mvp/shared.tsx','utf8')
const start=source.indexOf('function profileReconnectDelay')
const end=source.indexOf('export function useRoleSession',start)
assert.ok(start>=0&&end>start,'profile reconnect helper must exist')
const js=ts.transpileModule(source.slice(start,end),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText
const module={exports:{}}
vm.runInNewContext(js+'\nmodule.exports.delay=profileReconnectDelay;',{
  module,exports:module.exports,Math,
})
const delay=module.exports.delay

test('Realtime profile reconnect backs off to 30s and never grows unbounded',()=>{
  assert.deepEqual([0,1,2,3,4,5,6,50,-1].map(delay),[
    1200,2400,4800,9600,19200,30000,30000,30000,1200,
  ])
})

test('reconnect failure count survives channel recreation but resets for a different user',()=>{
  assert.match(source,/const profileReconnectState=useRef\(\{userId:'',failures:0\}\)/)
  assert.match(source,/if\(profileReconnectState\.current\.userId!==userId\)profileReconnectState\.current=\{userId,failures:0\}/)
  assert.match(source,/profileReconnectState\.current\.failures=Math\.min\(5,profileReconnectState\.current\.failures\+1\)/)
  assert.match(source,/if\(reconnectTimer!==undefined\)return/)
})

test('successful subscription and browser reconnection reset the backoff',()=>{
  assert.match(source,/if\(status==='SUBSCRIBED'\)\{profileReconnectState\.current\.failures=0;refreshRealtime\(\)\}/)
  assert.match(source,/const onOnline=\(\)=>\{profileReconnectState\.current\.failures=0;refresh\(\);reconnect\(\)\}/)
  assert.match(source,/return\(\)=>\{alive=false;if\(reconnectTimer\)window\.clearTimeout\(reconnectTimer\)/)
})
