export type HugoEdgeRole='client'|'provider'|'admin'|'superadmin'

const ALLOWED_ORIGINS=new Set([
 'https://sebastisnzoth.github.io',
 'https://ugo-admin-panel.vercel.app',
 'https://ugo-admin-panel-netlify.netlify.app',
 'https://zingy-youtiao-c00ece.netlify.app',
 'http://localhost:5173',
 'http://127.0.0.1:5173',
 'http://localhost:4173',
 'http://127.0.0.1:4173',
])

const TOP_LEVEL:Record<HugoEdgeRole,ReadonlySet<string>>={
 client:new Set(['draft','pedido','servicio','servicios','ofertas','profesionales','proveedores','ubicacion','pago','payment','status','screen','surface','summary']),
 provider:new Set(['screen','online','service','activeService','opportunities','earnings','profile','availability','summary','status']),
 admin:new Set(['hugo','dashboard','usuarios','proveedores','servicios','disputas','pagos','retiros','deuda_ugo_efectivo','documentos','categorias','tarifas','notificaciones','mapa_operativo','timeline_estados','calificaciones','mensajes','configuracion','readiness','incidentes','fuentes_no_disponibles','generado_en']),
 superadmin:new Set(['hugo','dashboard','superadmin','usuarios','proveedores','servicios','disputas','pagos','retiros','deuda_ugo_efectivo','documentos','categorias','tarifas','notificaciones','mapa_operativo','timeline_estados','calificaciones','mensajes','configuracion','readiness','incidentes','fuentes_no_disponibles','generado_en']),
}
const NEVER_KEY=/(?:authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|service[_-]?role|secret|password|passwd|client[_-]?secret|private[_-]?key|credential|cookie|session)/i
const CONTACT_KEY=/(?:^|_)(email|e[_-]?mail|phone|telefono|telefone|whatsapp|cpf|cnpj|documento_numero|document_number)(?:$|_)/i
const EXACT_LOCATION_KEY=/^(?:lat|lng|latitude|longitude|lat_cliente|lng_cliente|proveedor_lat|proveedor_lng)$/i
const THIRD_PARTY_PII_KEY=/^(?:nombre|apellido|name|full_name|contenido|comentario)$/i

const clean=(value:unknown,max=60_000)=>String(value??'').trim().slice(0,max)
function sanitize(value:unknown,max=60_000){
 return clean(value,max)
  .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,'Bearer [REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]')
  .replace(/\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]')
  .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\b\s*[:=]\s*["']?[^\s,"'}]{6,}["']?/gi,'$1=[REDACTED]')
}
function record(value:unknown){return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function scrub(value:unknown,role:HugoEdgeRole,depth=0):unknown{
 if(depth>8)return'[REDACTED_DEPTH]'
 if(typeof value==='string')return sanitize(value,2000)
 if(typeof value==='number'||typeof value==='boolean'||value===null)return value
 if(Array.isArray(value))return value.slice(0,60).map(item=>scrub(item,role,depth+1))
 const source=record(value);if(!source)return undefined
 const out:Record<string,unknown>={}
 for(const[key,item]of Object.entries(source)){
  if(NEVER_KEY.test(key)||CONTACT_KEY.test(key))continue
  if((role==='admin'||role==='superadmin')&&(EXACT_LOCATION_KEY.test(key)||THIRD_PARTY_PII_KEY.test(key)))continue
  const next=scrub(item,role,depth+1);if(next!==undefined)out[key]=next
 }
 return out
}
function redactLegacyPii(text:string){
 return text
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[REDACTED_EMAIL]')
  .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,'[REDACTED_PHONE]')
}

export function hugoEdgeOrigin(req:Request){
 const origin=req.headers.get('origin')||''
 return ALLOWED_ORIGINS.has(origin)?origin:''
}
export function hugoEdgeCorsHeaders(origin:string){
 return{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}
}
export function sanitizeHugoEdgeContext(value:unknown,role:string,max=60_000){
 const normalized=(['client','provider','admin','superadmin'].includes(role)?role:'client')as HugoEdgeRole
 const input=String(value??'').trim();if(!input)return''
 if(input.length>120_000)return''
 let parsed:unknown
 try{parsed=JSON.parse(input)}catch{
  if(/^[{[]/.test(input))return''
  return redactLegacyPii(sanitize(input,Math.min(max,12_000))).slice(0,Math.min(max,12_000))
 }
 const source=record(parsed);if(!source)return''
 const allowed=TOP_LEVEL[normalized],filtered:Record<string,unknown>={}
 for(const[key,item]of Object.entries(source)){if(!allowed.has(key))continue;const next=scrub(item,normalized);if(next!==undefined)filtered[key]=next}
 return sanitize(JSON.stringify(filtered),max)
}
