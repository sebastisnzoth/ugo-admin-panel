import type{HugoRequestedRole}from'./authority'
import{clean,sanitizeForModel}from'./security'

type JsonRecord=Record<string,unknown>

const TOP_LEVEL:Record<HugoRequestedRole,ReadonlySet<string>>={
 client:new Set(['draft','pedido','servicio','servicios','ofertas','profesionales','proveedores','ubicacion','pago','payment','status','screen','surface','summary']),
 provider:new Set(['screen','online','service','activeService','opportunities','earnings','profile','availability','summary','status']),
 admin:new Set(['hugo','dashboard','usuarios','proveedores','servicios','disputas','pagos','retiros','deuda_ugo_efectivo','documentos','categorias','tarifas','notificaciones','mapa_operativo','timeline_estados','calificaciones','mensajes','configuracion','readiness','incidentes','fuentes_no_disponibles','generado_en']),
 superadmin:new Set(['hugo','dashboard','superadmin','usuarios','proveedores','servicios','disputas','pagos','retiros','deuda_ugo_efectivo','documentos','categorias','tarifas','notificaciones','mapa_operativo','timeline_estados','calificaciones','mensajes','configuracion','readiness','incidentes','fuentes_no_disponibles','generado_en']),
}

const NEVER_KEY=/(?:authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|service[_-]?role|secret|password|passwd|client[_-]?secret|private[_-]?key|credential|cookie|session)/i
const CONTACT_KEY=/(?:^|_)(email|e[_-]?mail|phone|telefono|telefone|whatsapp|cpf|cnpj|documento_numero|document_number)(?:$|_)/i
const EXACT_LOCATION_KEY=/^(?:lat|lng|latitude|longitude|lat_cliente|lng_cliente|proveedor_lat|proveedor_lng)$/i
const THIRD_PARTY_PII_KEY=/^(?:nombre|apellido|name|full_name|contenido|comentario)$/i

function record(value:unknown):JsonRecord|null{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:null
}
function scrub(value:unknown,role:HugoRequestedRole,depth=0):unknown{
 if(depth>8)return'[REDACTED_DEPTH]'
 if(typeof value==='string')return sanitizeForModel(value,2000)
 if(typeof value==='number'||typeof value==='boolean'||value===null)return value
 if(Array.isArray(value))return value.slice(0,60).map(item=>scrub(item,role,depth+1))
 const source=record(value)
 if(!source)return undefined
 const out:JsonRecord={}
 for(const[key,item]of Object.entries(source)){
  if(NEVER_KEY.test(key)||CONTACT_KEY.test(key))continue
  if((role==='admin'||role==='superadmin')&&(EXACT_LOCATION_KEY.test(key)||THIRD_PARTY_PII_KEY.test(key)))continue
  const next=scrub(item,role,depth+1)
  if(next!==undefined)out[key]=next
 }
 return out
}
function redactLegacyPii(text:string){
 return text
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[REDACTED_EMAIL]')
  .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,'[REDACTED_PHONE]')
}

export function sanitizeHugoContextForRole(value:unknown,role:HugoRequestedRole,max=60_000){
 const raw=clean(value,max)
 if(!raw)return''
 let parsed:unknown
 try{parsed=JSON.parse(raw)}catch{return redactLegacyPii(sanitizeForModel(raw,Math.min(max,12_000))).slice(0,Math.min(max,12_000))}
 const source=record(parsed)
 if(!source)return''
 const allowed=TOP_LEVEL[role]
 const filtered:JsonRecord={}
 for(const[key,item]of Object.entries(source)){
  if(!allowed.has(key))continue
  const next=scrub(item,role,0)
  if(next!==undefined)filtered[key]=next
 }
 return sanitizeForModel(JSON.stringify(filtered),max)
}

export function hugoAllowedContextFields(role:HugoRequestedRole){return[...TOP_LEVEL[role]]}
