import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync('src/i18n/locale.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve))}
function mount({role='client',session=null,stored={},profileLanguage=null}={}){
 const storage=new Map(Object.entries(stored)),slots=[],effects=[],writes=[]
 let cursor=0,current=session,listener,value,dirty=false,hold=null
 const react={
  createContext:()=>({Provider:'provider'}),
  createElement:(_tag,props)=>{value=props.value;return null},
  useState:initial=>{const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],next=>{slots[index]=next;dirty=true}]},
  useRef:initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial})},
  useEffect:fn=>{const index=cursor++;if(!(index in slots)){slots[index]=true;effects.push(fn)}},
  useCallback:fn=>fn,useMemo:fn=>fn(),useContext:()=>value,
 }
 const client={auth:{getSession:async()=>({data:{session:current},error:null}),onAuthStateChange:fn=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}}},updateUser:async({data})=>{writes.push(data);if(hold){const wait=hold;hold=null;await wait}return {error:null}}},from:()=>({update:()=>({eq:async()=>({error:null})}),select:()=>({eq:()=>({maybeSingle:async()=>({data:{idioma_preferido:profileLanguage},error:null})})})})}
 const module={exports:{}},document={documentElement:{lang:''}}
 vm.runInNewContext(code,{module,exports:module.exports,console,Intl,Date,URLSearchParams,document,window:{location:{search:'?app='+role},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))}},require:p=>p==='react'?react:p.includes('roleSupabase')?{getRoleSupabase:()=>client}:p.includes('lib/supabase')?{supabase:client}:p.includes('extended')?{extendedMessages:{'pt-BR':{},es:{},en:{}}}:{coreMessages:{'pt-BR':{},es:{},en:{}}}})
 function render(){cursor=0;dirty=false;module.exports.LocaleProvider({children:null});while(effects.length)effects.shift()();return value}
 render()
 return {storage,writes,render,get value(){return dirty?render():value},event(event,next){current=next;listener(event,next)},holdNextUpdate(){let resolve;hold=new Promise(r=>resolve=r);return resolve}}
}
const user=(language,time=0,id='u1')=>({user:{id,user_metadata:{preferred_language:language,preferred_language_updated_at:time}}})
test('newer account preference replaces stale device cache on sign-in for every role',async()=>{
 for(const role of ['client','provider','admin']){
  const app=mount({role,session:user('en',20),stored:{['ugo.locale.'+role+'.u1']:'es',['ugo.locale.'+role+'.u1.updatedAt']:'10'}})
  await settle();assert.equal(app.value.locale,'en',role)
 }
})
test('selection survives token refresh, logout, reload and login',async()=>{
 const app=mount({session:user('pt-BR',1)})
 await settle();app.value.setLocale('es');assert.equal(app.value.locale,'es');await settle()
 app.event('TOKEN_REFRESHED',user('pt-BR',1));assert.equal(app.value.locale,'es')
 app.event('SIGNED_OUT',null);assert.equal(app.value.locale,'es')
 const reloaded=mount({session:user('es',app.writes.at(-1)?.preferred_language_updated_at),stored:Object.fromEntries(app.storage)})
 await settle();assert.equal(reloaded.value.locale,'es')
})
test('rapid selections serialize metadata writes and latest selection wins',async()=>{
 const app=mount({session:user('pt-BR',1)});await settle()
 const release=app.holdNextUpdate();app.value.setLocale('es');await settle()
 app.value.setLocale('en');await settle();release();await settle()
 assert.equal(app.value.locale,'en');assert.equal(app.writes.at(-1).preferred_language,'en')
 assert.ok(app.writes.at(-1).preferred_language_updated_at>0)
})

test('legacy client profile preference is restored when Auth metadata is absent',async()=>{
 const app=mount({session:{user:{id:'legacy',user_metadata:{}}},profileLanguage:'es'})
 await settle();assert.equal(app.value.locale,'es')
 assert.equal(app.writes.length,0,'restoring a language must not update the auth session')
})
