import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('calendar bridge delegates lifecycle sync to provider feature hook',async()=>{const[bridge,hook]=await Promise.all([read('src/mvp/provider/ProviderCalendarSyncBridge.tsx'),read('src/features/provider/hooks/useProviderCalendarAutoSync.ts')]);assert.match(bridge,/useProviderCalendarAutoSync\(data\.accessToken,data\.service\?\.id,data\.service\?\.estado\)/);assert.doesNotMatch(bridge,/setInterval|addEventListener|syncProviderCalendar/);assert.match(hook,/syncProviderCalendar\(token\)/);assert.match(hook,/\[hasToken,serviceId,serviceState\]/);assert.doesNotMatch(hook,/\[accessToken,serviceId,serviceState\]/);assert.match(hook,/5\*60\*1000/);assert.match(hook,/addEventListener\('online',onOnline\)/);assert.match(hook,/visibilityState==='visible'/);assert.match(hook,/removeEventListener\('online',onOnline\)/)})

test('calendar API rejects 401 without forcing a provider token refresh loop',async()=>{const calendar=await read('src/mvp/provider/providerCalendar.ts');assert.match(calendar,/response\.status===401/);assert.match(calendar,/Authorization:'Bearer '\+accessToken/);assert.doesNotMatch(calendar,/auth\.auth\.refreshSession\(/);assert.doesNotMatch(calendar,/getRoleSupabase\('provider'\)/)})

test('optional calendar auto-sync must not request serverless routes on unsupported hosts',async()=>{
 const[hook,ui,calendar]=await Promise.all([read('src/features/provider/hooks/useProviderCalendarAutoSync.ts'),read('src/mvp/UserGoogleCalendarConnect.tsx'),read('src/mvp/provider/providerCalendar.ts')])
 assert.match(hook,/isProviderCalendarAutoSyncHostSupported\(\)/)
 assert.match(hook,/isCalendarApiHostSupported\(window\.location\.hostname,import\.meta\.env\.DEV\)/)
 assert.match(hook,/!isProviderCalendarAutoSyncHostSupported\(\)/)
 assert.match(ui,/isCalendarApiHostSupported\(window\.location\.hostname,import\.meta\.env\.DEV\)/)
 assert.match(calendar,/\.github\.io/)
})

test('calendar host gate excludes Vite dev, local preview, and static Pages without disabling Vercel',async()=>{
 const ts=await import('typescript')
 const source=await read('src/mvp/provider/providerCalendar.ts')
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}})
 const {isCalendarApiHostSupported:allowed}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'))
 for(const host of ['localhost','127.0.0.1','0.0.0.0','[::1]','::1','ugo.localhost','sebastisnzoth.github.io','']){
  assert.equal(allowed(host,false),false,'preview/static host '+host+' must not call /api/calendar')
 }
 for(const host of ['ugo-admin-panel.vercel.app','ugo.example.com']){
  assert.equal(allowed(host,false),true,'serverless-capable host '+host+' should retain calendar access')
  assert.equal(allowed(host,true),false,'Vite DEV must never assume serverless routes')
 }
})

test('disconnected provider never triggers periodic calendar sync, and account switches recheck identity',async()=>{
 const ts=await import('typescript')
 const vm=await import('node:vm')
 const source=(await read('src/features/provider/hooks/useProviderCalendarAutoSync.ts')).replaceAll('import.meta.env.DEV','false')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 let hooks=[],index=0,cleanup=null,tick=null,statusCalls=[],syncCalls=[]
 const useRef=value=>{const slot=index++;return hooks[slot]||(hooks[slot]={current:value})}
 const useEffect=callback=>{if(cleanup)cleanup();cleanup=callback()}
 const window={location:{hostname:'ugo-admin-panel.vercel.app'},setInterval:callback=>{tick=callback;return 1},clearInterval:()=>{},addEventListener:()=>{},removeEventListener:()=>{}}
 const document={visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}}
 const providerCalendar={
  isCalendarApiHostSupported:host=>host==='ugo-admin-panel.vercel.app',
  getProviderCalendarStatus:async token=>{statusCalls.push(token);return{configured:true,connected:token==='token-b'}},
  syncProviderCalendar:async token=>{syncCalls.push(token);return{configured:true,connected:false}}
 }
 const exports={}
 const requireModule=name=>name==='react'?{useEffect,useRef}:providerCalendar
 vm.runInNewContext(code,{exports,require:requireModule,window,document,navigator:{onLine:true}})
 const flush=()=>new Promise(resolve=>setImmediate(resolve))
 const render=token=>{index=0;exports.useProviderCalendarAutoSync(token,'service-a','asignado')}
 render('token-a')
 await flush()
 assert.deepEqual(statusCalls,['token-a'])
 assert.deepEqual(syncCalls,[],'disconnected provider must not issue calendar sync')
 tick();await flush()
 assert.deepEqual(statusCalls,['token-a'],'disconnected status is cached')
 assert.deepEqual(syncCalls,[],'periodic tick must not sync disconnected account')
 render('token-b');await flush()
 assert.deepEqual(statusCalls,['token-a','token-b'],'new account must not inherit previous status')
 assert.deepEqual(syncCalls,['token-b'],'connected account still syncs')
 tick();await flush()
 assert.deepEqual(syncCalls,['token-b'],'disconnected sync response disables future automatic sync')
 window.location.hostname='sebastisnzoth.github.io'
 render('token-c');await flush()
 assert.deepEqual(statusCalls,['token-a','token-b'],'static Pages must not call serverless calendar')
 cleanup()
})
