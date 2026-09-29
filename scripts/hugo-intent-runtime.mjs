import assert from'node:assert/strict'
import fs from'node:fs/promises'
import crypto from'node:crypto'
import ts from'typescript'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_INPUTS_REQUIRED')

async function loadTsModule(path,{stripImports=false,prelude=''}={}){
 const source=await fs.readFile(path,'utf8')
 const prepared=stripImports?source.replace(/^import[^\n]*\n/gm,''):source
 const js=ts.transpileModule(prelude+prepared,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
 return{module:await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`),source,hash:crypto.createHash('sha256').update(source).digest('hex')}
}
const catalogLoaded=await loadTsModule('src/mvp/voiceCatalog.ts',{stripImports:true,prelude:"const getRoleSupabase=()=>{throw new Error('not used by readiness resolver')};const providerRadarForCategory=()=>[];const refreshProviderRadar=async()=>{};\n"})
const intentLoaded=await loadTsModule('src/features/client/hugo/hugoVoiceIntent.ts')
const resolve=catalogLoaded.module.resolveVoiceCategoryFromCatalog
const{resolveHugoGlobalCommand,parseHugoWhen,isHugoAffirmative,isHugoRetry}=intentLoaded.module
assert.equal(typeof resolve,'function')

const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:auth,error:authError}=await sb.auth.signInWithPassword({email,password})
assert.ifError(authError);assert.ok(auth.session,'CLIENT_TEST_SESSION_REQUIRED')
const{data:categories,error:categoryError}=await sb.from('categorias').select('id,slug,nombre').eq('activa',true).order('nombre')
assert.ifError(categoryError);assert.ok((categories||[]).length>0,'ACTIVE_TEST_CATEGORIES_REQUIRED')

const normalize=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const expected={
 plumbing:['plomer','hidraul','encan','fontan'],
 painting:['pint'],
 electricity:['electric','eletric'],
}
function matchesGroup(category,group){
 const value=normalize(`${category?.slug||''} ${category?.nombre||''}`)
 return expected[group].some(token=>value.includes(token))
}
const cases=[
 ['necesito un plomero urgente','plumbing'],
 ['tengo una fuga de agua en la cocina','plumbing'],
 ['se rompió una tubería y pierde agua','plumbing'],
 ['preciso de um encanador agora','plumbing'],
 ['tem um vazamento no banheiro','plumbing'],
 ['necesito un pintor para el living','painting'],
 ['quiero pintar las paredes del dormitorio','painting'],
 ['hay que hacer un retoque de pintura','painting'],
 ['preciso pintar uma parede','painting'],
 ['necesito un electricista porque estoy sin luz','electricity'],
]
const category_results=cases.map(([phrase,group])=>{
 const category=resolve(categories,phrase)
 const pass=Boolean(category)&&matchesGroup(category,group)
 assert.equal(pass,true,`${phrase} -> expected ${group}, got ${category?.nombre||category?.slug||'null'}`)
 return{phrase,expected_group:group,category_id:category.id,category_name:category.nombre,category_slug:category.slug,status:'PASS'}
})
for(const phrase of['ver actividad','volver al inicio','cancelar pedido']){
 const category=resolve(categories,phrase)
 assert.equal(category,null,`navigation phrase must not become service category: ${phrase}`)
}
const now=new Date(2026,8,29,12,0,0)
const actions=[
 {phrase:'Volveme a la pantalla de inicio',expected:'home',actual:resolveHugoGlobalCommand('Volveme a la pantalla de inicio')},
 {phrase:'ver actividad',expected:'activity',actual:resolveHugoGlobalCommand('ver actividad')},
 {phrase:'cancelar pedido',expected:'cancel',actual:resolveHugoGlobalCommand('cancelar pedido')},
 {phrase:'mañana por la tarde',expected:'programar',actual:parseHugoWhen('mañana por la tarde',now)?.when||null},
 {phrase:'sí, confirmar pedido',expected:true,actual:isHugoAffirmative('sí, confirmar pedido')},
 {phrase:'reintentar búsqueda',expected:true,actual:isHugoRetry('reintentar búsqueda')},
]
for(const row of actions)assert.deepEqual(row.actual,row.expected,row.phrase)
await fs.mkdir('artifacts',{recursive:true})
const evidence={
 schema_version:'UGO_HUGO_INTENT_RUNTIME_V1',
 readiness_id:'hugo-intent',
 task_id:'readiness-hugo-intent',
 job_id:'UGO-READINESS-HUGO-INTENT',
 correlation_id:'readiness-hugo-intent-20260929T212200Z-6c13b3ea',
 environment:'UGO TEST',
 production_touched:false,
 sha,
 active_category_count:categories.length,
 source_hashes:{voice_catalog:catalogLoaded.hash,hugo_voice_intent:intentLoaded.hash},
 category_results,
 negative_category_phrases:['ver actividad','volver al inicio','cancelar pedido'],
 action_results:actions.map(row=>({...row,status:'PASS'})),
 completed_at:new Date().toISOString()
}
await fs.writeFile('artifacts/hugo-intent-runtime.json',JSON.stringify(evidence,null,2)+'\n')
await sb.auth.signOut()
console.log(JSON.stringify({status:'PASS',sha,category_cases:category_results.length,action_cases:actions.length,active_categories:categories.length}))
