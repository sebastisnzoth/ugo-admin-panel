import{calendarUrl,connectionFor,googleConfigured,googleJson,httpError,refreshAccess,requireProvider,type ApiReq,type ApiRes}from'./_shared'

type ServiceRow={id:string;numero:number|null;estado:string;descripcion:string|null;direccion_cliente:string|null;programado_para:string|null;metadata:Record<string,unknown>|null;categoria:{nombre?:string|null}|Array<{nombre?:string|null}>|null}
type EventMap={servicio_id:string;google_event_id:string}
const LIVE=new Set(['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado','completado'])
const minutes=(service:ServiceRow)=>{const value=Number(service.metadata?.estimated_duration_minutes||60);return Number.isFinite(value)&&value>=15&&value<=24*60?value:60}
const category=(service:ServiceRow)=>Array.isArray(service.categoria)?service.categoria[0]?.nombre:service.categoria?.nombre
function body(service:ServiceRow){
 const start=new Date(String(service.programado_para)),end=new Date(start.getTime()+minutes(service)*60000),prefix=service.estado==='completado'?'✓ ':service.estado==='disputado'?'⚖ ':''
 return{summary:prefix+'UGO #'+String(service.numero||service.id.slice(0,8))+' · '+String(category(service)||'Servicio'),location:service.direccion_cliente||undefined,description:['Trabajo UGO',service.descripcion||'', 'serviceId: '+service.id].filter(Boolean).join('\n'),start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()},reminders:{useDefault:false,overrides:[{method:'popup',minutes:60},{method:'popup',minutes:15}]},extendedProperties:{private:{ugoServiceId:service.id,ugoState:service.estado}}}
}
async function deleteGoogle(access:string,calendarId:string,eventId:string){const response=await fetch(calendarUrl(calendarId,'/'+encodeURIComponent(eventId)),{method:'DELETE',headers:{Authorization:'Bearer '+access}});if(response.ok||response.status===404||response.status===410)return;if(!response.ok)throw new Error('No se pudo borrar el evento de Google Calendar ('+response.status+').')}

export default async function handler(req:ApiReq,res:ApiRes){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'})
 try{
  const{userId,admin}=await requireProvider(req);if(!googleConfigured())return res.status(200).json({configured:false,connected:false,created:0,updated:0,deleted:0})
  const connection=await connectionFor(admin,userId);if(!connection)return res.status(200).json({configured:true,connected:false,created:0,updated:0,deleted:0})
  const access=await refreshAccess(connection.refresh_token)
  const[{data:services,error:serviceError},{data:mappings,error:mapError}]=await Promise.all([
   admin.from('servicios').select('id,numero,estado,descripcion,direccion_cliente,programado_para,metadata,categoria:categorias(nombre)').eq('proveedor_id',userId).order('updated_at',{ascending:false}).limit(200),
   admin.from('proveedor_calendar_eventos').select('servicio_id,google_event_id').eq('proveedor_id',userId)
  ])
  if(serviceError)throw serviceError;if(mapError)throw mapError
  const map=new Map<string,EventMap>((mappings||[]).map(row=>[String(row.servicio_id),row as EventMap])),seen=new Set<string>();let created=0,updated=0,deleted=0
  for(const raw of services||[]){
   const service=raw as unknown as ServiceRow,mapped=map.get(service.id);seen.add(service.id)
   const shouldExist=Boolean(service.programado_para&&LIVE.has(service.estado)&&service.estado!=='cancelado')
   if(!shouldExist){
    if(mapped){await deleteGoogle(access,connection.calendar_id,mapped.google_event_id);await admin.from('proveedor_calendar_eventos').delete().eq('servicio_id',service.id).eq('proveedor_id',userId);deleted++}
    continue
   }
   const eventBody=body(service)
   if(mapped){
    try{const payload=await googleJson(access,calendarUrl(connection.calendar_id,'/'+encodeURIComponent(mapped.google_event_id)),{method:'PATCH',body:JSON.stringify(eventBody)});const{error}=await admin.from('proveedor_calendar_eventos').update({event_etag:String((payload as Record<string,unknown>)?.etag||'')||null,last_action:'updated',last_error:null,synced_at:new Date().toISOString()}).eq('servicio_id',service.id).eq('proveedor_id',userId);if(error)throw error;updated++}
    catch(error){if(Number((error as{statusCode?:number}).statusCode)!==404)throw error;await admin.from('proveedor_calendar_eventos').delete().eq('servicio_id',service.id).eq('proveedor_id',userId);map.delete(service.id)}
   }
   if(!map.has(service.id)){
    const payload=await googleJson(access,calendarUrl(connection.calendar_id),{method:'POST',body:JSON.stringify(eventBody)}),eventId=String((payload as Record<string,unknown>)?.id||'');if(!eventId)throw new Error('Google Calendar no devolvió eventId.')
    const{error}=await admin.from('proveedor_calendar_eventos').upsert({servicio_id:service.id,proveedor_id:userId,google_event_id:eventId,event_etag:String((payload as Record<string,unknown>)?.etag||'')||null,last_action:'created',last_error:null,synced_at:new Date().toISOString()},{onConflict:'servicio_id'});if(error)throw error;created++
   }
  }
  for(const mapped of map.values()){if(seen.has(mapped.servicio_id))continue;await deleteGoogle(access,connection.calendar_id,mapped.google_event_id);await admin.from('proveedor_calendar_eventos').delete().eq('servicio_id',mapped.servicio_id).eq('proveedor_id',userId);deleted++}
  return res.status(200).json({configured:true,connected:true,created,updated,deleted,syncedAt:new Date().toISOString()})
 }catch(error){console.error('UGO Calendar sync failed',error);return httpError(res,error)}
}
