import{createClient}from'@supabase/supabase-js'

type RequestLike={headers?:Record<string,string|undefined>;method?:string;body?:unknown}
type ResponseLike={setHeader:(name:string,value:string)=>void;status:(code:number)=>ResponseLike;json:(body:unknown)=>unknown;end:()=>unknown}
type JsonRecord=Record<string,unknown>
const asRecord=(v:unknown):JsonRecord=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as JsonRecord:{}
const clean=(v:unknown,max=1000)=>String(v??'').trim().slice(0,max)
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const roleDepartment:Record<string,number>={client:3,provider:4,admin:2,superadmin:1}

function bearer(req:RequestLike){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():''}

export default async function handler(req:RequestLike,res:ResponseLike){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Método no permitido.'})
 try{
  const url=process.env.SUPABASE_URL
  const anon=process.env.SUPABASE_ANON_KEY
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!anon||!service)return res.status(503).json({ok:false,error:'Auditoría Hugo no configurada.'})
  const token=bearer(req)
  if(!token)return res.status(401).json({ok:false,error:'Autenticación requerida.'})
  const body=asRecord(typeof req.body==='string'?JSON.parse(req.body):req.body)
  const correlationId=clean(body.correlation_id,80)
  const action=clean(body.action,120)
  const intent=clean(body.intent,500)
  const role=clean(body.role,30).toLowerCase()||'client'
  const serviceId=clean(body.service_id,80)
  const effect=asRecord(body.effect)
  const response=asRecord(body.response)
  if(!uuid.test(correlationId)||!action||!intent||!(role in roleDepartment))return res.status(400).json({ok:false,error:'Traza Hugo inválida.'})

  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const{data:authData,error:authError}=await authClient.auth.getUser(token)
  if(authError||!authData.user)return res.status(401).json({ok:false,error:'Sesión inválida o vencida.'})
  const userClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const{data:profile,error:profileError}=await userClient.from('usuarios').select('tipo,activo').eq('id',authData.user.id).maybeSingle()
  if(profileError||!profile?.activo)return res.status(403).json({ok:false,error:'Perfil sin autoridad activa.'})
  const actual=String(profile.tipo||'').toLowerCase()
  const allowed=role==='client'?actual==='cliente':role==='provider'?actual==='proveedor':role==='admin'?actual==='admin'||actual==='superadmin':actual==='superadmin'
  if(!allowed)return res.status(403).json({ok:false,error:'Autoridad Hugo no válida para esta traza.'})

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const stage={
    intent,
    authority:{requested_role:role,profile_role:actual,decision:'ALLOW'},
    action,
    effect,
    audit:{correlation_id:correlationId},
    response,
    source:'hugo:native-voice-tool-call'
  }
  const decisionRow={
    department_id:roleDepartment[role],
    decision:`HUGO_${action.toUpperCase()}`,
    reason:'Authenticated Hugo tool action with explicit correlated trace.',
    authority_class:'GREEN',
    policy_version:'hugo-audit-v1',
    evidence_refs:[{type:'hugo_trace',correlation_id:correlationId,service_id:uuid.test(serviceId)?serviceId:null}],
    authorization_result:'ALLOW',
    correlation_id:correlationId
  }
  const{data:decision,error:decisionError}=await admin.from('autonomous_decision_ledger').insert(decisionRow).select('id').single()
  if(decisionError)throw decisionError
  const evidenceRow={
    evidence_type:'hugo_action_trace',
    reference:`hugo://trace/${correlationId}`,
    metadata:{...stage,decision_ledger_id:decision.id,actor_id:authData.user.id,service_id:uuid.test(serviceId)?serviceId:null},
    correlation_id:correlationId,
    created_by:authData.user.id
  }
  const{data:evidence,error:evidenceError}=await admin.from('autonomous_evidence_ledger').insert(evidenceRow).select('id').single()
  if(evidenceError)throw evidenceError
  const{data:audit,error:auditError}=await admin.from('audit_log').insert({
    evento:'HUGO_ACTION_TRACE',
    actor_id:authData.user.id,
    entidad_tipo:uuid.test(serviceId)?'servicio':'hugo',
    entidad_id:uuid.test(serviceId)?serviceId:null,
    detalles:{...stage,decision_ledger_id:decision.id,evidence_ledger_id:evidence.id}
  }).select('id').single()
  if(auditError)throw auditError

  return res.status(200).json({
    ok:true,
    correlation_id:correlationId,
    ledgers:{decision_id:decision.id,evidence_id:evidence.id,audit_log_id:audit.id},
    stages:['INTENT','AUTHORITY','ACTION','EFFECT','AUDIT','RESPONSE']
  })
 }catch(error:unknown){
  console.error('Hugo audit failed',error)
  return res.status(500).json({ok:false,error:'No se pudo persistir la auditoría de Hugo.'})
 }
}
