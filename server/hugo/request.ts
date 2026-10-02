import type{HugoRequestedRole}from'./authority'
import{asRecord,type JsonRecord}from'./json'

export type HugoRequestBody=JsonRecord&{
 role:HugoRequestedRole
 message?:string
 text?:string
 context?:string
 surface?:string
 locale?:string
 history?:unknown[]
 tts?:boolean
}

const HUGO_ROLES=new Set<HugoRequestedRole>(['client','provider','admin','superadmin'])

function invalidRequest(message:string){
 return Object.assign(new Error(message),{status:400,code:'INVALID_REQUEST'})
}

function parseRawBody(raw:unknown):JsonRecord{
 let value=raw
 if(typeof raw==='string'){
  try{value=JSON.parse(raw)}
  catch{throw invalidRequest('El cuerpo de la solicitud no contiene JSON válido.')}
 }
 if(value===null||typeof value!=='object'||Array.isArray(value))throw invalidRequest('El cuerpo de la solicitud debe ser un objeto JSON.')
 return asRecord(value)
}

function optionalString(body:JsonRecord,key:string,max:number){
 const value=body[key]
 if(value===undefined||value===null)return
 if(typeof value!=='string')throw invalidRequest(`El campo ${key} debe ser texto.`)
 if(value.length>max)throw invalidRequest(`El campo ${key} excede el tamaño permitido.`)
}

export function parseHugoRequestBody(raw:unknown):HugoRequestBody{
 const body=parseRawBody(raw)
 const roleRaw=body.role
 const role=roleRaw===undefined||roleRaw===null||roleRaw===''?'client':String(roleRaw).trim().toLowerCase()
 if(!HUGO_ROLES.has(role as HugoRequestedRole))throw invalidRequest('Rol Hugo no válido.')
 if(body.tts!==undefined&&typeof body.tts!=='boolean')throw invalidRequest('El campo tts debe ser booleano.')
 optionalString(body,'message',8_000)
 optionalString(body,'text',4_000)
 optionalString(body,'context',120_000)
 optionalString(body,'surface',240)
 optionalString(body,'locale',32)
 if(body.history!==undefined){
  if(!Array.isArray(body.history))throw invalidRequest('El campo history debe ser una lista.')
  if(body.history.length>32)throw invalidRequest('El historial excede el máximo permitido.')
  for(const item of body.history){
   if(item===null||typeof item!=='object'||Array.isArray(item))throw invalidRequest('Cada elemento de history debe ser un objeto.')
  }
 }
 return{...body,role:role as HugoRequestedRole,history:body.history as unknown[]|undefined}
}
