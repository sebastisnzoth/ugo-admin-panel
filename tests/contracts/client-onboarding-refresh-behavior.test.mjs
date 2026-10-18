import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync('src/features/client/onboarding/ClientOnboardingGate.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]))
test('equivalent refreshed auth/profile objects do not remount the client UI',async()=>{
 const slots=[],effects=[];let cursor=0,reads=0,auth,dirty=false
 const sb={from:table=>({select:()=>({eq:()=>({single:async()=>{reads++;return {data:{nombre:'QA'},error:null}},maybeSingle:async()=>{reads++;return {data:{onboarding_completo_at:'2026-01-01',termos_aceitos_at:'2026-01-01',telefono:'12345678',direccion:'QA',ciudad:'TEST'},error:null}}})})})}
 const react={createElement:(type,props,...children)=>({type,props,children}),Fragment:'fragment',useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{if(!Object.is(slots[i],v)){slots[i]=v;dirty=true}}]},useCallback:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn},useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i],deps)){slots[i]=deps;effects.push(fn)}}}
 const t=k=>k,module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require:p=>p==='react'?react:p.endsWith('/locale')?{useLocale:()=>({t})}:p.endsWith('/shared')?{useRoleSession:()=>auth,LoadingScreen:'loading',AuthScreen:'auth'}:{},console})
 const refresh=()=>{auth={supabase:sb,session:{user:{id:'u1'}},profile:{id:'u1',nombre:'QA'},loading:false}}
 const render=()=>{cursor=0;dirty=false;const out=module.exports.ClientOnboardingGate({children:'client'});while(effects.length)effects.shift()();return out}
 refresh();render();for(let i=0;i<8;i++){await new Promise(r=>setImmediate(r));if(dirty)render()}
 assert.equal(reads,2)
 refresh();render();await new Promise(r=>setImmediate(r))
 assert.equal(reads,2,'same identity must not reload onboarding and unmount open menus')
})
