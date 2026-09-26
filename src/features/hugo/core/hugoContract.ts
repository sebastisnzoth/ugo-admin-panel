export type HugoRole='client'|'provider'|'admin'|'superadmin'
export type HugoLocale='es-AR'|'pt-BR'

export type HugoActionResult={
 ok:boolean
 code?:string
 message?:string
 data?:unknown
}

export type HugoLiveState='idle'|'connecting'|'ready'|'hearing'|'speaking'|'error'

const CLIENT_ACTIONS=new Set([
 'get_current_location','set_request_category','set_request_description','set_schedule',
 'set_payment_method','search_providers','create_service_request','get_service_status',
 'cancel_service','approve_work','confirm_cash_payment','rate_service',
])
const PROVIDER_ACTIONS=new Set([
 'provider_set_online','provider_set_offline','provider_list_opportunities',
 'provider_accept_job','provider_reject_job','provider_update_service_status',
])
const ADMIN_ACTIONS=new Set([
 'admin_get_operational_summary','admin_find_service','admin_find_user',
])

export function isHugoActionAllowed(role:HugoRole,action:string){
 if(role==='client')return CLIENT_ACTIONS.has(action)
 if(role==='provider')return PROVIDER_ACTIONS.has(action)
 if(role==='admin'||role==='superadmin')return ADMIN_ACTIONS.has(action)
 return false
}

export function hugoSystemInstruction(role:HugoRole,locale:HugoLocale){
 const language=locale==='pt-BR'
  ?'Converse em português brasileiro, de forma natural, breve e útil.'
  :'Conversá en español rioplatense, de forma natural, breve y útil.'
 const scope=role==='client'
  ?'Sos Hugo Cliente. Ayudá a pedir y seguir servicios reales de UGO.'
  :role==='provider'
   ?'Sos Hugo Proveedor. Ayudá a operar trabajos reales sin saltar GPS, geofence, evidencia ni lifecycle.'
   :'Sos Hugo Admin. Sólo consultá mediante herramientas administrativas declaradas; los cambios sensibles siguen en controles auditados.'
 return [
  scope,
  language,
  'Nunca inventes profesionales, disponibilidad, ubicaciones, pagos, estados, resultados ni acciones.',
  'Cuando necesites operar UGO, usá únicamente las herramientas declaradas para este rol y esperá su resultado antes de confirmar éxito.',
  'Una respuesta de herramienta con ok=false significa que la acción NO ocurrió.',
  'Recordá durante la sesión los datos ya confirmados y no los vuelvas a preguntar.',
 ].join(' ')
}

export function currentHugoLocale():HugoLocale{
 try{
  const stored=String(localStorage.getItem('ugo.locale')||localStorage.getItem('ugo_locale')||'').toLowerCase()
  const html=String(document.documentElement.lang||'').toLowerCase()
  const lang=stored||html||String(navigator.language||'').toLowerCase()
  return lang.startsWith('pt')?'pt-BR':'es-AR'
 }catch{return'es-AR'}
}
