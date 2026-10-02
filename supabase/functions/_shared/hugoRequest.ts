export type HugoEdgeRole='client'|'provider'|'admin'|'superadmin'
export type HugoEdgeBody=Record<string,unknown>&{
 role:HugoEdgeRole
 message?:string
 text?:string
 context?:string
 surface?:string
 locale?:string
 history?:unknown[]
 tts?:boolean
 voice_live_token?:boolean
 action?:string
}

const ROLES=new Set<HugoEdgeRole>(['client','provider','admin','superadmin'])

function invalid(message:string){
 throw Object.assign(new Error(message),{status:400,code:'INVALID_REQUEST'})
}
function optionalString(body:Record<string,unknown>,key:string,max:number){
 const value=body[key]
 if(value===undefined||value===null)return
 if(typeof value!=='string')invalid(`El campo ${key} debe ser texto.`)
 if((value as string).length>max)invalid(`El campo ${key} excede el tamaño permitido.`)
}

export function parseHugoEdgeBody(value:unknown,defaultRole:HugoEdgeRole='client'):HugoEdgeBody{
 if(value===null||typeof value!=='object'||Array.isArray(value))invalid('El cuerpo debe ser un objeto JSON.')
 const body=value as Record<string,unknown>
 const raw=body.role===undefined||body.role===null||body.role===''?defaultRole:String(body.role).trim().toLowerCase()
 if(!ROLES.has(raw as HugoEdgeRole))invalid('Rol Hugo no válido.')
 if(body.tts!==undefined&&typeof body.tts!=='boolean')invalid('El campo tts debe ser booleano.')
 if(body.voice_live_token!==undefined&&typeof body.voice_live_token!=='boolean')invalid('El campo voice_live_token debe ser booleano.')
 optionalString(body,'message',8_000)
 optionalString(body,'text',4_000)
 optionalString(body,'context',120_000)
 optionalString(body,'surface',240)
 optionalString(body,'locale',32)
 optionalString(body,'action',64)
 if(body.history!==undefined){
  if(!Array.isArray(body.history))invalid('El campo history debe ser una lista.')
  if(body.history.length>32)invalid('El historial excede el máximo permitido.')
  for(const item of body.history)if(item===null||typeof item!=='object'||Array.isArray(item))invalid('Cada elemento de history debe ser un objeto.')
 }
 return{...body,role:raw as HugoEdgeRole,history:body.history as unknown[]|undefined}
}
