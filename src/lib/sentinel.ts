import { getRoleSupabase, type UgoRole } from './roleSupabase'
import { supabase as adminSupabase } from './supabase'
import { UGO_ENVIRONMENT } from './supabaseProject'

type SentinelRole=UgoRole|'admin'|'system'|'unknown'
type Severity='P0'|'P1'|'P2'|'P3'
type SentinelContext={role?:SentinelRole;serviceId?:string|null;action?:string|null;checklistCode?:string|null;severity?:Severity;expiresAt:number}
type IncidentInput={eventType:string;message:string;error?:unknown;role?:SentinelRole;severity?:Severity;serviceId?:string|null;action?:string|null;checklistCode?:string|null;metadata?:Record<string,unknown>}
type RpcIncident={p_event_type:string;p_message:string;p_severity:Severity;p_source_role:SentinelRole;p_route:string|null;p_action:string|null;p_service_id:string|null;p_checklist_code:string|null;p_stack:string|null;p_metadata:Record<string,unknown>}

const CONTEXT_KEY='ugo-test-sentinel-context'
const ANON_QUEUE_KEY='ugo-test-sentinel-anonymous-queue'
const PRIVATE_METADATA_KEYS=new Set(['token','authorization','email','phone','messagecontent','password','secret','apikey','api_key'])
const RUNTIME_REVISION=(import.meta.env.VITE_APP_REVISION||'unversioned').slice(0,80)
const MAX_ANON_QUEUE=20
let installed=false

function routeLabel(){
 const url=new URL(window.location.href),app=url.searchParams.get('app'),demo=url.searchParams.get('demo')
 const params=new URLSearchParams();if(app)params.set('app',app);if(demo)params.set('demo',demo)
 return `${url.pathname}${params.size?`?${params.toString()}`:''}`
}
function inferRole():SentinelRole{
 const app=new URLSearchParams(window.location.search).get('app')||''
 if(app.includes('provider'))return'provider'
 if(app.includes('client'))return'client'
 if(app==='admin')return'admin'
 if(app==='development')return'system'
 return'unknown'
}
function discardContext(){
 try{sessionStorage.removeItem(CONTEXT_KEY)}catch(error){console.debug('UGO Sentinel context cleanup unavailable',error)}
}
function readContext():SentinelContext|null{
 try{const raw=sessionStorage.getItem(CONTEXT_KEY);if(!raw)return null;const parsed=JSON.parse(raw)as SentinelContext;if(!parsed.expiresAt||parsed.expiresAt<Date.now()){discardContext();return null}return parsed}catch(error){console.debug('UGO Sentinel context unavailable',error);return null}
}
function redactText(value:string,max:number){
 return value
  .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,'Bearer [protegido]')
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[dato protegido]')
  .replace(/(?:https?:\/\/|www\.)\S+/gi,'[enlace protegido]')
  .replace(/\+?[0-9][0-9 ()\-.]{7,}[0-9]/g,'[contacto protegido]')
  .slice(0,max)
}
function errorDetails(error:unknown,message:string){
 if(error instanceof Error)return{message:redactText(error.message||message,2000),stack:error.stack?redactText(error.stack,12000):null,name:error.name}
 if(typeof error==='string')return{message:redactText(error||message,2000),stack:null,name:'Error'}
 return{message:redactText(message,2000),stack:null,name:'Error'}
}
function safeMetadata(value:Record<string,unknown>|undefined,errorName:string){
 const base:Record<string,unknown>={errorName,online:navigator.onLine,visibility:document.visibilityState,runtimeRevision:RUNTIME_REVISION}
 if(!value)return base
 for(const[key,item]of Object.entries(value)){
  if(PRIVATE_METADATA_KEYS.has(key.toLowerCase())||key==='runtimeRevision')continue
  if(typeof item==='string')base[key]=redactText(item,500)
  else if(typeof item==='number'||typeof item==='boolean'||item===null)base[key]=item
 }
 return base
}
async function reportingClient(role:SentinelRole){
 const preferred=role==='client'?getRoleSupabase('client'):role==='provider'?getRoleSupabase('provider'):role==='admin'?adminSupabase:null
 if(preferred){const{data}=await preferred.auth.getSession();if(data.session)return preferred}
 for(const candidate of[getRoleSupabase('client'),getRoleSupabase('provider'),adminSupabase]){const{data}=await candidate.auth.getSession();if(data.session)return candidate}
 return null
}
function readAnonymousQueue():RpcIncident[]{
 try{const parsed=JSON.parse(localStorage.getItem(ANON_QUEUE_KEY)||'[]');return Array.isArray(parsed)?parsed.slice(-MAX_ANON_QUEUE):[]}catch{return[]}
}
function writeAnonymousQueue(queue:RpcIncident[]){
 try{if(queue.length)localStorage.setItem(ANON_QUEUE_KEY,JSON.stringify(queue.slice(-MAX_ANON_QUEUE)));else localStorage.removeItem(ANON_QUEUE_KEY)}catch(error){console.debug('UGO Sentinel anonymous queue unavailable',error)}
}
function queueAnonymousIncident(payload:RpcIncident){
 const safePayload:RpcIncident={...payload,p_severity:'P2',p_source_role:'unknown',p_service_id:null,p_checklist_code:null,p_metadata:{runtimeRevision:RUNTIME_REVISION,queuedAnonymous:true}}
 writeAnonymousQueue([...readAnonymousQueue(),safePayload])
}
async function flushAnonymousQueueWithClient(sb:any){
 const queue=readAnonymousQueue();if(!queue.length)return
 const pending:RpcIncident[]=[]
 for(const payload of queue){
  try{const{error}=await sb.rpc('report_development_incident',payload);if(error)pending.push(payload)}catch{pending.push(payload)}
 }
 writeAnonymousQueue(pending)
}
async function flushAnonymousQueue(){const sb=await reportingClient('unknown');if(sb)await flushAnonymousQueueWithClient(sb as any)}

export function setSentinelContext(input:Omit<SentinelContext,'expiresAt'>,ttlMs=30000){
 if(UGO_ENVIRONMENT!=='test')return
 try{sessionStorage.setItem(CONTEXT_KEY,JSON.stringify({...input,expiresAt:Date.now()+ttlMs}))}catch(error){console.debug('UGO Sentinel could not persist local context',error)}
}
export function clearSentinelContext(){discardContext()}

export async function reportSentinelIncident(input:IncidentInput){
 if(UGO_ENVIRONMENT!=='test')return null
 try{
  const context=readContext(),role=input.role||context?.role||inferRole(),severity=input.severity||context?.severity||'P1'
  const serviceId=input.serviceId??context?.serviceId??null,action=input.action??context?.action??null,checklistCode=input.checklistCode??context?.checklistCode??null
  const details=errorDetails(input.error,input.message),metadata=safeMetadata(input.metadata,details.name)
  const payload:RpcIncident={p_event_type:redactText(input.eventType,120),p_message:details.message,p_severity:severity,p_source_role:role,p_route:redactText(routeLabel(),240),p_action:action?redactText(action,160):null,p_service_id:serviceId,p_checklist_code:checklistCode,p_stack:details.stack,p_metadata:metadata}
  const sb=await reportingClient(role)
  if(!sb){queueAnonymousIncident(payload);return null}
  await flushAnonymousQueueWithClient(sb as any)
  const{data,error}=await(sb as any).rpc('report_development_incident',payload)
  if(error){console.warn('UGO Sentinel could not persist incident',error.message);return null}
  return data as string|null
 }catch(error){console.warn('UGO Sentinel reporting failure',error);return null}
}

export function installSentinel(){
 if(installed||UGO_ENVIRONMENT!=='test'||typeof window==='undefined')return
 installed=true
 void flushAnonymousQueue()
 window.setInterval(()=>void flushAnonymousQueue(),30000)
 window.addEventListener('online',()=>void flushAnonymousQueue())
 window.addEventListener('error',event=>{
  const target=event.target as HTMLElement|null
  if(!(event instanceof ErrorEvent)){
   const resource=(target as HTMLImageElement|HTMLScriptElement|null)?.src||(target as HTMLLinkElement|null)?.href||target?.tagName||'resource'
   void reportSentinelIncident({eventType:'resource_error',message:`No se pudo cargar ${String(resource).slice(0,240)}`,severity:'P2'})
   return
  }
  void reportSentinelIncident({eventType:'window_error',message:event.message||'Error de ejecución no controlado',error:event.error,severity:'P0'})
 },true)
 window.addEventListener('unhandledrejection',event=>{
  const reason=event.reason
  void reportSentinelIncident({eventType:'unhandled_rejection',message:reason instanceof Error?reason.message:String(reason||'Promesa rechazada sin manejar'),error:reason,severity:'P0'})
 })
}
