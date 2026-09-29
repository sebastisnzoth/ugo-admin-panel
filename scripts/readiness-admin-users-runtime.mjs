import { mkdir, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const service=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||''
const adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!anon||!service||!adminPassword)throw new Error('UGO_TEST_ENV_REQUIRED')
const root=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {error:signError}=await admin.auth.signInWithPassword({email:adminEmail,password:adminPassword});if(signError)throw signError
const {data:users,error:usersError}=await admin.from('usuarios').select('id,nombre,tipo,created_at,updated_at').order('created_at',{ascending:false}).limit(25);if(usersError)throw usersError
if(!users?.length)throw new Error('NO_TEST_USERS')
const fixtureId=process.env.UGO_TEST_ADMIN_USERS_FIXTURE_ID||'eccc6d2e-c2cd-4079-bd98-f3782c0aa9c1'
const target=users.find(u=>u.id===fixtureId)
if(!target||target.tipo!=='proveedor')throw new Error('COMPLETE_TEST_USER_FIXTURE_MISSING:'+fixtureId)
const [{data:services,error:se},{data:docs,error:de},{data:audits,error:ae}]=await Promise.all([
 admin.from('servicios').select('id,estado,created_at,programado_para,aceptado_at,iniciado_at,completado_at,cancelado_at,cliente_id,proveedor_id').or(`cliente_id.eq.${target.id},proveedor_id.eq.${target.id}`).order('created_at',{ascending:false}).limit(50),
 target.tipo==='proveedor'?admin.from('documentos').select('id,tipo,estado,created_at,usuario_id').eq('usuario_id',target.id).limit(50):Promise.resolve({data:[],error:null}),
 admin.from('audit_log').select('id,evento,actor_id,entidad_id,created_at').or(`entidad_id.eq.${target.id},actor_id.eq.${target.id}`).limit(50)
]);if(se||de||ae)throw se||de||ae
const email=`readiness-admin-users-${Date.now()}@example.com`,password='TempAa1!'+crypto.randomUUID().slice(0,8)
const {data:created,error:ce}=await root.auth.admin.createUser({email,password,email_confirm:true});if(ce||!created.user)throw ce||new Error('TEMP_AUTH_CREATE_FAILED')
const tempId=created.user.id
try{
 const {error:ue}=await root.from('usuarios').upsert({id:tempId,nombre:'Readiness',apellido:'AdminUsers',email,tipo:'cliente',activo:true,updated_at:new Date().toISOString()},{onConflict:'id'});if(ue)throw ue
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const {error:le}=await client.auth.signInWithPassword({email,password});if(le)throw le
 const [{data:blockedAudit,error:bae},{data:blockedDocs,error:bde}]=await Promise.all([
  client.from('audit_log').select('id').limit(5),
  client.from('documentos').select('id,usuario_id').neq('usuario_id',tempId).limit(5)
 ])
 if(bae||bde)throw bae||bde
 if((blockedAudit||[]).length!==0)throw new Error('NON_ADMIN_AUDIT_LEAK')
 if((blockedDocs||[]).length!==0)throw new Error('NON_OWNER_DOC_LEAK')
 if(!(services||[]).length)throw new Error('ADMIN_SERVICES_MISSING')
 if(!(docs||[]).length)throw new Error('ADMIN_DOCUMENTS_MISSING')
 if(!(audits||[]).length)throw new Error('ADMIN_AUDIT_HISTORY_MISSING')
 const timelineRows=(services||[]).filter(s=>s.created_at||s.programado_para||s.aceptado_at||s.iniciado_at||s.completado_at||s.cancelado_at)
 if(!timelineRows.length)throw new Error('ADMIN_SERVICE_TIMELINE_MISSING')
 const payload={schema_version:'UGO_READINESS_ADMIN_USERS_V1',readiness_id:'admin-users',task_id:'readiness-admin-users',job_id:'UGO-READINESS-ADMIN-USERS',environment:'UGO TEST',runtime_sha:process.env.GITHUB_SHA||'local',production_touched:false,test_project:'tmossnqfwfwjrtzwcbmm',generated_at:new Date().toISOString(),target:{id:target.id,tipo:target.tipo,created_at:target.created_at,updated_at:target.updated_at},admin_access:{users:users.length,services:(services||[]).length,documents:(docs||[]).length,audits:(audits||[]).length,timeline_rows:timelineRows.length,sample_service_timestamps:timelineRows.slice(0,3).map(s=>({id:s.id,created_at:s.created_at,programado_para:s.programado_para,aceptado_at:s.aceptado_at,iniciado_at:s.iniciado_at,completado_at:s.completado_at,cancelado_at:s.cancelado_at}))},permissions:{non_admin_audit_rows:(blockedAudit||[]).length,non_owner_document_rows:(blockedDocs||[]).length,admin_sensitive_reads:'PASS'}}
 await mkdir('artifacts/readiness-admin-users',{recursive:true});await writeFile('artifacts/readiness-admin-users/runtime.json',JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload))
}finally{await root.from('usuarios').delete().eq('id',tempId);await root.auth.admin.deleteUser(tempId)}
