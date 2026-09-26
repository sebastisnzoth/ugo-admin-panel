import{UgoMcpError,assertUuid,fetchJson,loadRuntimeConfig,resolveAuthenticatedUser,verifyRole}from'./currentJob.js'

function text(v,n,max=2000){const s=String(v??'').trim();if(!s)throw new UgoMcpError('invalid_input',n+' requerido',400);if(s.length>max)throw new UgoMcpError('invalid_input',n+' demasiado largo',400);return s}
function coord(v,n,min,max){const x=Number(v);if(!Number.isFinite(x)||x<min||x>max)throw new UgoMcpError('invalid_input',n+' inválida',400);return x}

export function validateCreateRequestInput(input={}){
 const userId=assertUuid(input.userId,'userId')
 if(input.role!=='client')throw new UgoMcpError('invalid_input','role debe ser client',400)
 if(input.confirmed!==true)throw new UgoMcpError('confirmation_required','Se requiere confirmación explícita',400)
 const categoryId=assertUuid(input.categoryId,'categoryId'),description=text(input.description,'description',1200),address=text(input.address,'address',500)
 const latitude=coord(input.latitude,'latitude',-90,90),longitude=coord(input.longitude,'longitude',-180,180)
 if(latitude===0&&longitude===0)throw new UgoMcpError('invalid_location','0,0 no es una ubicación válida',400)
 const paymentMethod=input.paymentMethod==='pix'?'pix':input.paymentMethod==='cash'?'efectivo':null
 if(!paymentMethod)throw new UgoMcpError('invalid_input','paymentMethod debe ser cash o pix',400)
 const requestDraftId=input.requestDraftId?assertUuid(input.requestDraftId,'requestDraftId'):null
 return{userId,role:'client',categoryId,description,address,latitude,longitude,paymentMethod,requestDraftId}
}

export async function createServiceRequest(input,{env=process.env,fetchImpl=globalThis.fetch}={}){
 if(typeof fetchImpl!=='function')throw new UgoMcpError('runtime_error','fetch no está disponible',500)
 const p=validateCreateRequestInput(input),config=loadRuntimeConfig(env),auth=await resolveAuthenticatedUser(fetchImpl,config)
 if(auth!==p.userId)return{status:'unauthorized',reason:'authenticated_user_mismatch',service:null}
 if(!await verifyRole(fetchImpl,config,p.userId,'client'))return{status:'unauthorized',reason:'role_or_account_mismatch',service:null}

 if(p.requestDraftId){
  const q=new URLSearchParams({select:'id,estado',cliente_id:`eq.${p.userId}`,'metadata->>request_draft_id':`eq.${p.requestDraftId}`,limit:'1'})
  const existing=await fetchJson(fetchImpl,`${config.supabaseUrl}/rest/v1/servicios?${q}`,config)
  if(Array.isArray(existing)&&existing[0]?.id)return{status:'ok',idempotent:true,service_id:existing[0].id,state:existing[0].estado}
 }
 const metadata={source:'hugo-conversational',voice:true,demo:false,payment_method:p.paymentMethod,...(p.requestDraftId?{request_draft_id:p.requestDraftId}:{})}
 const rows=await fetchJson(fetchImpl,`${config.supabaseUrl}/rest/v1/servicios?select=id,estado`,config,{method:'POST',headers:{Prefer:'return=representation'},body:{cliente_id:p.userId,categoria_id:p.categoryId,estado:'buscando',descripcion:p.description,direccion_cliente:p.address,tarifa:null,urgencia:false,metadata}})
 const service=Array.isArray(rows)?rows[0]:rows
 if(!service?.id)throw new UgoMcpError('create_failed','Supabase no devolvió el servicio creado',502)
 const serviceId=String(service.id)
 try{
  await fetchJson(fetchImpl,`${config.supabaseUrl}/rest/v1/rpc/guardar_ubicacion_servicio_cliente`,config,{method:'POST',body:{p_servicio_id:serviceId,p_lat:p.latitude,p_lng:p.longitude}})
  const matching=await fetchJson(fetchImpl,`${config.supabaseUrl}/rest/v1/rpc/iniciar_matching`,config,{method:'POST',body:{p_servicio_id:serviceId}})
  return{status:'ok',idempotent:false,service_id:serviceId,state:'buscando',matching_started:true,matching}
 }catch(error){
  return{status:'partial',service_id:serviceId,state:'buscando',matching_started:false,code:error instanceof UgoMcpError?error.code:'matching_failed',message:'El pedido quedó guardado pero no se confirmó el inicio del matching'}
 }
}
