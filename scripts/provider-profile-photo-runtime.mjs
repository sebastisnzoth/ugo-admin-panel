import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
import{fetchWithTransientRetry,retrySupabaseResult}from'./lib/transient-retry.mjs'
const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',serviceRole=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_PROVIDER_EMAIL||'',password=process.env.UGO_TEST_PROVIDER_PASSWORD||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY');assert.ok(anon&&serviceRole&&email&&password&&sha,'PROFILE_PHOTO_RUNTIME_INPUTS_REQUIRED')
const provider=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:login,error:loginError}=await retrySupabaseResult(()=>provider.auth.signInWithPassword({email,password}),{label:'profile-photo.signIn'});assert.ifError(loginError);assert.ok(login.user?.id)
const uid=login.user.id
const{data:before,error:beforeError}=await retrySupabaseResult(()=>admin.from('perfiles_proveedor').select('foto_perfil_path').eq('usuario_id',uid).single(),{label:'profile-photo.read-before'});assert.ifError(beforeError)
const oldPath=before?.foto_perfil_path||null
const path=uid+'/profile/runtime-'+sha.slice(0,12)+'-'+Date.now()+'.png'
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zt9sAAAAASUVORK5CYII=','base64')
let cleanup=false
try{
let uploadAttempts=0
const upload=await retrySupabaseResult(async()=>{uploadAttempts+=1;return provider.storage.from('provider-public').upload(path,new Blob([png],{type:'image/png'}),{contentType:'image/png',upsert:false})},{label:'profile-photo.upload'})
const duplicateAfterRetry=uploadAttempts>1&&upload.error&&(upload.error.statusCode===409||/already exists|duplicate/i.test(String(upload.error.message||upload.error.error||'')))
if(duplicateAfterRetry)console.warn('[profile-photo] el upload ya se había aplicado tras un fallo transitorio · el readback verifica el contenido')
else assert.ifError(upload.error)
const update=await retrySupabaseResult(()=>provider.from('perfiles_proveedor').update({foto_perfil_path:path}).eq('usuario_id',uid),{label:'profile-photo.update'});assert.ifError(update.error)
const{data:read,error:readError}=await retrySupabaseResult(()=>admin.from('perfiles_proveedor').select('foto_perfil_path').eq('usuario_id',uid).single(),{label:'profile-photo.readback'});assert.ifError(readError);assert.equal(read.foto_perfil_path,path)
const publicUrl=provider.storage.from('provider-public').getPublicUrl(path).data.publicUrl;assert.ok(publicUrl.includes('/provider-public/'))
const response=await fetchWithTransientRetry(publicUrl,undefined,{label:'profile-photo.publicFetch'});assert.equal(response.ok,true);assert.match(response.headers.get('content-type')||'',/image\/png/)
 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/provider-profile-photo-runtime.json',JSON.stringify({readiness_id:'provider-profile-photo',sha,environment:'UGO TEST',production_touched:false,provider_id:uid,path,old_path:oldPath,db_persisted:true,public_fetch_status:response.status,content_type:response.headers.get('content-type'),result:'PASS',completed_at:new Date().toISOString()},null,2)+'\n')
}finally{
 const restore=await retrySupabaseResult(()=>admin.from('perfiles_proveedor').update({foto_perfil_path:oldPath}).eq('usuario_id',uid),{label:'profile-photo.restore'});assert.ifError(restore.error)
 const remove=await retrySupabaseResult(()=>admin.storage.from('provider-public').remove([path]),{label:'profile-photo.remove'});assert.ifError(remove.error)
 const{data:after,error:afterError}=await retrySupabaseResult(()=>admin.from('perfiles_proveedor').select('foto_perfil_path').eq('usuario_id',uid).single(),{label:'profile-photo.read-after-cleanup'});assert.ifError(afterError);cleanup=(after?.foto_perfil_path||null)===oldPath
}
assert.equal(cleanup,true,'PROFILE_PHOTO_CLEANUP_REQUIRED')
const proof=JSON.parse(await fs.readFile('artifacts/provider-profile-photo-runtime.json','utf8'));proof.cleanup_ok=true
await fs.writeFile('artifacts/provider-profile-photo-runtime.json',JSON.stringify(proof,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',sha,path}))
