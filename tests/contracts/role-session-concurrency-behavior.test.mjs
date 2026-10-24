import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the actual hook with controlled IO completion order, not source regexes.
const source=fs.readFileSync('src/mvp/shared.tsx','utf8')
const code=ts.transpileModule(source.slice(source.indexOf('const AUTH_PROFILE_RETRY_DELAYS'),source.indexOf('export function AuthScreen')),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const session=id=>({user:{id,created_at:'2020-01-01'},expires_at:9999999999})
const response=next=>({data:{session:next},error:null})
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
function mount(initial=response(session('provider-a'))){
 const slots=[],effects=[],timers=new Map(),queries=[],events=[]
 let cursor=0,sequence=0,listener,value,current=initial,getSessionOverride=null,profileOverride=null,signouts=0
 const memo=(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value}
 const hooks={useId:()=> 'instance',useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},useRef:initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn()})}}}
 const client={auth:{getSession:()=>getSessionOverride?getSessionOverride():Promise.resolve(current),onAuthStateChange:fn=>{listener=fn;return{data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{signouts++;current=response(null);listener('SIGNED_OUT',null);return{error:null}}},from:()=>({select:()=>({eq:(_key,id)=>({maybeSingle:()=>{queries.push(id);return profileOverride?profileOverride(id):Promise.resolve({data:{id,nombre:'QA',tipo:'proveedor',activo:true},error:null})}})})}),channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel},removeChannel:async()=>{}}
 const module={exports:{}}
 vm.runInNewContext(code,{...hooks,AbortController,module,exports:module.exports,getRoleSupabase:()=>client,URL,Date,Error,console,recordSessionDiagnostic:(...args)=>events.push(args),OAUTH_ROLE_KEY:'oauth',document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},window:{location:{href:'https://test.invalid/?app=provider'},history:{replaceState(){}},localStorage:{getItem:()=>null,removeItem(){}},setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),addEventListener(){},removeEventListener(){}}})
 function render(){cursor=0;value=module.exports.useRoleSession('provider');while(effects.length)effects.shift()();return value}
 render()
 return{queries,events,get signouts(){return signouts},get value(){return render()},event:(event,next)=>{current=response(next);listener(event,next)},holdSession:fn=>{getSessionOverride=fn},holdProfile:fn=>{profileOverride=fn},async settle(){for(let i=0;i<20;i++){await new Promise(r=>setImmediate(r));for(const[id,timer]of timers){if(timer.ms===0){timers.delete(id);timer.fn()}}render()}},fireGrace(){for(const[id,timer]of timers){if(timer.ms===1200){timers.delete(id);timer.fn()}}},fireFailSafe(){for(const[id,timer]of timers){if(timer.ms===15000){timers.delete(id);timer.fn()}}}}
}

test('late SIGNED_OUT confirmation cannot erase a newer signed-in session',async()=>{
 const app=mount();await app.settle()
 const pending=deferred();app.holdSession(()=>pending.promise)
 app.event('SIGNED_OUT',null);await app.settle()
 app.event('SIGNED_IN',session('provider-b'));await app.settle()
 pending.resolve(response(null));await app.settle()
 assert.equal(app.value.session?.user.id,'provider-b')
})

test('a getSession transport error is not authoritative evidence of logout',async()=>{
 const app=mount();await app.settle()
 app.holdSession(async()=>({data:{session:null},error:new Error('network unavailable')}))
 app.event('SIGNED_OUT',null);await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a')
 assert.equal(app.signouts,0)
})

test('bootstrap transport failure remains unresolved instead of authorizing the login screen',async()=>{
 const app=mount({data:{session:null},error:new Error('network unavailable')});await app.settle();app.fireFailSafe()
 assert.equal(app.value.sessionChecked,false)
 assert.match(app.value.error,/conex|sesión/i)
})

test('empty INITIAL_SESSION does not override a failed bootstrap check',async()=>{
 const app=mount({data:{session:null},error:new Error('network unavailable')})
 app.event('INITIAL_SESSION',null);await app.settle()
 assert.equal(app.value.sessionChecked,false)
})

test('a successful empty bootstrap authorizes the login screen',async()=>{
 const app=mount(response(null));app.event('INITIAL_SESSION',null);await app.settle()
 assert.equal(app.value.sessionChecked,true);assert.equal(app.value.session,null)
})

test('confirmed sign-out clears session and profile and does not revoke other sessions',async()=>{
 const app=mount();await app.settle();await app.value.signOut();await app.settle()
 assert.equal(app.value.session,null);assert.equal(app.value.profile,null);assert.equal(app.signouts,1)
})

test('TOKEN_REFRESHED preserves the session without an unnecessary profile query',async()=>{
 const app=mount();await app.settle();const count=app.queries.length
 app.event('TOKEN_REFRESHED',session('provider-a'));await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a');assert.equal(app.queries.length,count)
})

test('TOKEN_REFRESHED during sign-in cannot cancel the first profile load',async()=>{
 const app=mount(response(null));await app.settle()
 app.event('SIGNED_IN',session('provider-a'));app.event('TOKEN_REFRESHED',session('provider-a'));await app.settle()
 assert.equal(app.value.profile?.id,'provider-a')
})

test('a profile response begun before sign-out cannot restore the old profile',async()=>{
 const app=mount();await app.settle();const pending=deferred()
 app.holdProfile(()=>pending.promise)
 app.event('SIGNED_IN',session('provider-a'));await app.settle()
 await app.value.signOut();await app.settle()
 pending.resolve({data:{id:'provider-a',nombre:'QA',tipo:'proveedor',activo:true},error:null});await app.settle()
 assert.equal(app.value.session,null);assert.equal(app.value.profile,null)
})


test('transient SIGNED_OUT restores both provider profile and loading state',async()=>{
 const app=mount();await app.settle()
 app.event('SIGNED_OUT',null)
 app.holdSession(()=>Promise.resolve(response(session('provider-a'))))
 await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a')
 assert.equal(app.value.profile?.id,'provider-a')
 assert.equal(app.value.loading,false)
 assert.equal(app.value.sessionChecked,true)
})


test('provider remains signed in when first SIGNED_OUT check is temporarily empty',async()=>{
 const app=mount();await app.settle()
 let checks=0
 app.holdSession(()=>Promise.resolve(response(++checks===1?null:session('provider-a'))))
 app.event('SIGNED_OUT',null)
 await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a')
 app.fireGrace();await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a')
 assert.equal(app.value.profile?.id,'provider-a')
 assert.equal(app.signouts,0)
})

test('provider shows login after repeated confirmed absence of session',async()=>{
 const app=mount();await app.settle()
 app.holdSession(()=>Promise.resolve(response(null)))
 app.event('SIGNED_OUT',null);await app.settle()
 assert.equal(app.value.session?.user.id,'provider-a')
 app.fireGrace();await app.settle()
 assert.equal(app.value.session,null)
 assert.equal(app.value.profile,null)
 assert.equal(app.value.sessionChecked,true)
})
