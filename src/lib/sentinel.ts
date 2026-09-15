import { getRoleSupabase, type UgoRole } from './roleSupabase'
import { supabase as adminSupabase } from './supabase'
import { UGO_ENVIRONMENT } from './supabaseProject'

type SentinelRole=UgoRole|'admin'|'system'|'unknown'
type Severity='P0'|'P1'|'P2'|'P3'
type SentinelContext={role?:SentinelRole;serviceId?:string|null;action?:string|null;checklistCode?:string|null;severity?:Severity;expiresAt:number}
type IncidentInput={eventType:string;message:string;error?:unknown;role?:SentinelRole;severity?:Severity;serviceId?:string|null;action?:string|null;checklistCode?:string|null;metadata?:Record<string,unknown>}

const CONTEXT_KEY='ugo-test-sentinel-context'
const PRIVATE_METADATA_KEYS=new Set(['token','authorization','email','phone','messagecontent','password','secret','apikey','api_key'])
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
 if(app==='development'||app==='admin')return'admin'
 return'unknown'
}
function discardContext(){
 try{sessionStorage.removeItem(CONTEXT_KEY)}catch(error){console.debug('UGO Sentinel context cleanup unavailable',error)}
}
function readContext():SentinelContext|null{
 try{const raw=sessionStorage.getItem(CONTEXT_KEY);if(!raw)return null;const parsed=JSON.parse(raw)as SentinelContext;if(!parsed.expiresAt||parsed.expiresAt<Date.now()){discardContext();return null}return parsed}catch(error){console.debug('UGO Sentinel context unavailable',error);return null}
}
function errorDetails(error:unknown,message:string){
 if(error instanceof Error)return{message:error.message||message,stack:error.stack||null,name:error.name}
 if(typeof error==='string')return{message:error||message,stack:null,name:'Error'}
 return{message,stack:null,name:'Error'}
}
function safeMetadata(value:Record<string,unknown>|undefined,errorName:string){
 const base:Record<string,unknown>={errorName,online:navigator.onLine,visibility:document.visibilityState}
 if(!value)return base
 for(const[key,item]of Object.entries(value)){
  if(PRIVATE_METADATA_KEYS.has(key.toLowerCase()))continue
  if(typeof item==='string')base[key]=item.slice(0,500)
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
  const details=errorDetails(input.error,input.message),sb=await reportingClient(role)
  if(!sb)return null
  const{data,error}=await(sb as any).rpc('report_development_incident',{
   p_event_type:input.eventType,p_message:details.message,p_severity:severity,p_source_role:role,p_route:routeLabel(),p_action:action,p_service_id:serviceId,p_checklist_code:checklistCode,p_stack:details.stack,p_metadata:safeMetadata(input.metadata,details.name),
  })
  if(error){console.warn('UGO Sentinel could not persist incident',error.message);return null}
  return data as string|null
 }catch(error){console.warn('UGO Sentinel reporting failure',error);return null}
}

export function installSentinel(){
 if(installed||UGO_ENVIRONMENT!=='test'||typeof window==='undefined')return
 installed=true
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
