import React,{useCallback,useEffect,useState}from'react'
import{useProviderData}from'./providerData'
import{disconnectProviderCalendar,getProviderCalendarStatus,startProviderCalendar,syncProviderCalendar,type ProviderCalendarStatus}from'./providerCalendar'

const empty:ProviderCalendarStatus={configured:false,connected:false,email:null,calendarId:null,updatedAt:null}
export function ProviderCalendarIntegration(){
 const d=useProviderData(),[status,setStatus]=useState<ProviderCalendarStatus>(empty),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=useCallback(async()=>{if(!d.accessToken)return;setLoading(true);try{setStatus(await getProviderCalendarStatus(d.accessToken))}catch(error){setMessage(error instanceof Error?error.message:'No pudimos leer Google Calendar.')}finally{setLoading(false)}},[d.accessToken])
 useEffect(()=>{void load()},[load])
 const connect=async()=>{if(!d.accessToken||busy)return;setBusy(true);setMessage('');try{const{url}=await startProviderCalendar(d.accessToken);window.location.assign(url)}catch(error){setMessage(error instanceof Error?error.message:'No pudimos iniciar la conexión.');setBusy(false)}}
 const sync=async()=>{if(!d.accessToken||busy)return;setBusy(true);setMessage('');try{const result=await syncProviderCalendar(d.accessToken);setMessage('Agenda sincronizada: '+result.created+' nuevos, '+result.updated+' actualizados, '+result.deleted+' liberados.');await load()}catch(error){setMessage(error instanceof Error?error.message:'No pudimos sincronizar la agenda.')}finally{setBusy(false)}}
 const disconnect=async()=>{if(!d.accessToken||busy||!window.confirm('¿Desconectar Google Calendar? UGO dejará de reflejar nuevos cambios y retirará los eventos UGO que administra.'))return;setBusy(true);setMessage('');try{await disconnectProviderCalendar(d.accessToken);setStatus(empty);setMessage('Google Calendar desconectado.')}catch(error){setMessage(error instanceof Error?error.message:'No pudimos desconectar Google Calendar.')}finally{setBusy(false)}}
 if(loading)return <div className="provider-calendar-box"><p>Verificando Google Calendar…</p></div>
 if(!status.configured)return <div className="provider-calendar-box"><p>La integración está preparada. Falta habilitar las credenciales OAuth de Google en UGO.</p></div>
 return <div className="provider-calendar-box">
  {status.connected?<><p><strong>✓ Google Calendar conectado</strong>{status.email&&<><br/><span>{status.email}</span></>}</p><p>UGO es la fuente de verdad. Los trabajos programados se crean o actualizan en Calendar; una cancelación elimina el evento y libera el horario.</p><div className="provider-calendar-actions"><button type="button" disabled={busy} onClick={()=>void sync()}>{busy?'Sincronizando…':'Sincronizar ahora'}</button><button type="button" className="danger" disabled={busy} onClick={()=>void disconnect()}>Desconectar</button></div></>:<><p>Conectá tu agenda para que UGO refleje automáticamente trabajos programados, reprogramaciones y cancelaciones.</p><button type="button" disabled={busy} onClick={()=>void connect()}>{busy?'Abriendo Google…':'Conectar Google Calendar'}</button></>}
  {message&&<p className="provider-calendar-message" role="status">{message}</p>}
 </div>
}
