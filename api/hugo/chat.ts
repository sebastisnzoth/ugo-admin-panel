import{authorizeHugo}from'../../server/hugo/auth'
import{allowedHugoOrigin,isAllowedHugoRequestOrigin}from'../../server/hugo/cors'
import{sanitizeHugoContextForRole}from'../../server/hugo/contextPolicy'
import{askHugoText}from'../../server/hugo/modelAdapter'
import{asRecord,extractJson}from'../../server/hugo/json'
import{buildHugoPrompt}from'../../server/hugo/promptBuilder'
import{parseHugoRequestBody}from'../../server/hugo/request'
import{clean}from'../../server/hugo/security'
import{parseHugoUiAction}from'../../server/hugo/uiAction'
import{askHugoTts}from'../../server/hugo/ttsAdapter'
type RequestLike={headers?:Record<string,string|undefined>;method?:string;body?:unknown}
type ResponseLike={setHeader:(name:string,value:string)=>void;status:(code:number)=>ResponseLike;json:(body:unknown)=>unknown;end:()=>unknown}
export default async function handler(req:RequestLike,res:ResponseLike){
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Vary','Origin')
 res.setHeader('Access-Control-Allow-Headers','authorization, content-type')
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
 const origin=String(req.headers?.origin||'').trim(),corsOrigin=allowedHugoOrigin(req)
 if(corsOrigin)res.setHeader('Access-Control-Allow-Origin',corsOrigin)
 if(req.method==='OPTIONS')return origin&&!corsOrigin?res.status(403).end():res.status(200).end()
 if(req.method!=='POST')return res.status(405).json({hugo_mensaje:'Método no permitido.'})
 if(!isAllowedHugoRequestOrigin(req))return res.status(403).json({hugo_mensaje:'Origen no autorizado.'})
 try{
  const body=parseHugoRequestBody(req.body)
  const authority=await authorizeHugo(req,body)
  if(body.tts===true){
   const text=clean(body.text||body.message,360)
   if(!text)return res.status(400).json({error:'Texto requerido para voz.'})
   const started=Date.now(),audio=await askHugoTts(text,clean(body.locale,12)||'es-AR'),elapsed=Date.now()-started
   res.setHeader('Server-Timing',`gemini-tts;dur=${elapsed}`)
   return res.status(200).json({...audio,timing_ms:elapsed})
  }
  const message=clean(body.message,1800),context=sanitizeHugoContextForRole(body.context,authority.requestedRole),history=Array.isArray(body.history)?body.history:[]
  if(!message)return res.status(400).json({hugo_mensaje:'Mensaje requerido.'})
  const requestedRole=authority.requestedRole
  const surface=clean(body.surface,80)||'panel de control'
  const{clientMode,providerMode,adminRole,system,prompt,jsonMode}=buildHugoPrompt({requestedRole,context,surface,message})
  const result=await askHugoText(prompt,history,system,jsonMode),parsed=clientMode||providerMode?null:extractJson(result.text),reply=clientMode||providerMode?result.text:clean(asRecord(parsed).reply,1800),action=clientMode||providerMode?null:parseHugoUiAction(asRecord(parsed).ui_action,adminRole)
  return res.status(200).json({hugo_mensaje:reply||(clientMode?'Decime qué necesitás.':providerMode?'Decime en qué te ayudo con tu trabajo.':'Hola, ¿qué querés revisar?'),accion:null,ui_action:action,datos:null,model:result.model,model_provider:result.provider,fallback_used:result.fallback_used,correlation_id:result.correlation_id,model_timing_ms:result.timing_ms,authority:{role:authority.requestedRole,profile_role:String(authority.profile?.tipo||''),decision:'ALLOW'}})
 }catch(error:unknown){
  const info=asRecord(error),status=Number(info.status)||502
  console.error('Hugo chat failed',{status,error_code:clean(info.code,80)||undefined,correlation_id:clean(info.correlation_id,80)||undefined,message:error instanceof Error?clean(error.message,240):'Unknown Hugo error'})
  if(info.retryAfter)res.setHeader('Retry-After',String(info.retryAfter))
  const message=error instanceof Error?error.message:'Hugo no pudo responder ahora.'
  const nextStep=status===401?'Iniciá sesión nuevamente y reintentá.':status===403?'Revisá que tu cuenta tenga permiso para esta acción y reintentá.':status===429?'Esperá un momento y reintentá.':status===503||status===504?'Reintentá en unos instantes; el resto de UGO sigue disponible.':'Reintentá la acción. Si vuelve a fallar, seguí usando UGO sin voz y reportá el incidente.'
  return res.status(status>=400&&status<600?status:502).json({error:message,error_code:clean(info.code,80)||undefined,correlation_id:clean(info.correlation_id,80)||undefined,authority:info.authority||undefined,hugo_mensaje:`${message} ${nextStep}`,next_step:nextStep,accion:null,ui_action:null,datos:null})
 }
}
