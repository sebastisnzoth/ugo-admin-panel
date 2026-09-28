import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'', anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'', sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(!url.includes('tmossnqfwfwjrtzwcbmm')||!anon||!sk)throw new Error('UGO_TEST_ONLY')
const service=createClient(url,sk,{auth:{persistSession:false}})
async function login(email,password){const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;return {sb,id:r.data.user.id}}
const c=await login(process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD)
const p=await login(process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD)
const a=await login(process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD)
try{
 const cr=await c.sb.from('usuarios').select('tipo').eq('id',c.id).single(),pr=await p.sb.from('usuarios').select('tipo').eq('id',p.id).single(),ar=await a.sb.from('usuarios').select('tipo').eq('id',a.id).single()
 assert.equal(cr.data?.tipo,'cliente');assert.equal(pr.data?.tipo,'proveedor');assert.ok(['admin','superadmin'].includes(ar.data?.tipo))
 const denied=await c.sb.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:-27.4,p_lng:-48.4,p_captured_at:new Date().toISOString(),p_accuracy_m:10});assert.ok(denied.error)
 console.log(JSON.stringify({authenticated:true,clientRole:cr.data.tipo,providerRole:pr.data.tipo,adminRole:ar.data.tipo,clientProviderActionDenied:true}))
}finally{await Promise.allSettled([c.sb.auth.signOut(),p.sb.auth.signOut(),a.sb.auth.signOut()])}
