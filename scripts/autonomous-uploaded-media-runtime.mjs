import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const bucket='service-evidence'

const{data:services,error:serviceError}=await db
 .from('servicios')
 .select('id,estado,ambiente,created_at')
 .eq('ambiente','demo')
 .eq('estado','completado')
 .order('created_at',{ascending:false})
 .limit(30)
if(serviceError)throw serviceError

let selected=null
for(const service of services||[]){
 const{data:rows,error}=await db
  .from('evidencias_servicio')
  .select('tipo,storage_path,created_at')
  .eq('servicio_id',service.id)
  .in('tipo',['antes','despues'])
  .order('created_at',{ascending:false})
 if(error)throw error
 const before=rows?.find(x=>x.tipo==='antes')
 const after=rows?.find(x=>x.tipo==='despues')
 if(!before||!after)continue
 const checks=[]
 for(const row of [before,after]){
  const{data:signed,error:signedError}=await db.storage.from(bucket).createSignedUrl(row.storage_path,120)
  if(signedError||!signed?.signedUrl){checks.push(null);continue}
  const response=await fetch(signed.signedUrl)
  if(!response.ok){checks.push(null);continue}
  const bytes=Buffer.from(await response.arrayBuffer())
  if(bytes.length<1){checks.push(null);continue}
  checks.push({
   path:row.storage_path,
   bytes:bytes.length,
   sha256:createHash('sha256').update(bytes).digest('hex')
  })
 }
 if(checks.every(Boolean)){selected={service,before:checks[0],after:checks[1]};break}
}
if(!selected)throw new Error('NO_COMPLETED_DEMO_SERVICE_WITH_FETCHABLE_INITIAL_AND_FINAL_STORAGE_BYTES')

const publicUrl=(path)=>url+'/storage/v1/object/public/'+bucket+'/'+path.split('/').map(encodeURIComponent).join('/')
const publicResponses=await Promise.all([
 fetch(publicUrl(selected.before.path),{redirect:'manual'}),
 fetch(publicUrl(selected.after.path),{redirect:'manual'})
])
if(publicResponses.some(r=>r.ok))throw new Error('PRIVATE_BUCKET_PUBLIC_ACCESS_UNEXPECTED')

const{data:job,error:recordError}=await db.rpc('autonomous_record_uploaded_media_runtime',{
 p_service_id:selected.service.id,
 p_before_path:selected.before.path,
 p_after_path:selected.after.path,
 p_before_sha256:selected.before.sha256,
 p_after_sha256:selected.after.sha256,
 p_before_bytes:selected.before.bytes,
 p_after_bytes:selected.after.bytes,
 p_public_denied:true
})
if(recordError)throw recordError
if(job?.status!=='SUCCEEDED'||job?.verification_result?.passed!==true)throw new Error('UPLOADED_MEDIA_BYTES_NOT_VERIFIED')

const{data:coverage,error:coverageError}=await db
 .from('autonomous_quality_coverage')
 .select('coverage_key,status,updated_at')
 .eq('coverage_key','uploaded-media-bytes')
 .single()
if(coverageError)throw coverageError
if(coverage.status!=='COVERED')throw new Error('UPLOADED_MEDIA_BYTES_COVERAGE_NOT_PROMOTED')

console.log(JSON.stringify({
 uploadedMediaBytes:true,
 serviceId:selected.service.id,
 beforeBytes:selected.before.bytes,
 afterBytes:selected.after.bytes,
 publicAccessDenied:true,
 jobId:job.id,
 coverage:coverage.status
}))
