import{calendarUrl,connectionFor,httpError,refreshAccess,requireProvider,type ApiReq,type ApiRes}from'./_shared'

async function removeEvent(access:string,calendarId:string,eventId:string){const response=await fetch(calendarUrl(calendarId,'/'+encodeURIComponent(eventId)),{method:'DELETE',headers:{Authorization:'Bearer '+access}});return response.ok||response.status===404||response.status===410}
export default async function handler(req:ApiReq,res:ApiRes){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'})
 try{
  const{userId,admin}=await requireProvider(req),connection=await connectionFor(admin,userId)
  if(!connection)return res.status(200).json({connected:false})
  try{const access=await refreshAccess(connection.refresh_token),{data:events}=await admin.from('proveedor_calendar_eventos').select('google_event_id').eq('proveedor_id',userId);for(const event of events||[])await removeEvent(access,connection.calendar_id,String(event.google_event_id))}catch(error){console.warn('UGO Calendar cleanup best-effort',error)}
  await fetch('https://oauth2.googleapis.com/revoke?token='+encodeURIComponent(connection.refresh_token),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'}}).catch(()=>null)
  const{error:mapError}=await admin.from('proveedor_calendar_eventos').delete().eq('proveedor_id',userId);if(mapError)throw mapError
  const{error}=await admin.from('proveedor_calendar_conexiones').delete().eq('proveedor_id',userId);if(error)throw error
  return res.status(200).json({connected:false})
 }catch(error){return httpError(res,error)}
}
