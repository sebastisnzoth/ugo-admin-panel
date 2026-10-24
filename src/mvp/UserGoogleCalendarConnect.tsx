import React,{useEffect,useState}from'react'
import{getProviderCalendarStatus,startProviderCalendar,disconnectProviderCalendar}from'./provider/providerCalendar'

// A connection belongs to the authenticated UGO user, never to a shared account.
// A functioning calendar API requires the Vercel serverless runtime.
export function UserGoogleCalendarConnect({accessToken}:{accessToken:string}){
 const[connected,setConnected]=useState(false),[email,setEmail]=useState<string|null>(null)
 const[configured,setConfigured]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const available=typeof window!=='undefined'&&!window.location.hostname.endsWith('.github.io')&&!import.meta.env.DEV
 useEffect(()=>{let alive=true;if(!available||!accessToken){setLoading(false);return}
   void getProviderCalendarStatus(accessToken).then(result=>{if(alive){setConfigured(result.configured);setConnected(result.connected);setEmail(result.email)}})
     .catch(error=>{if(alive)setMessage(error instanceof Error?error.message:'No se pudo consultar Google Calendar.')})
     .finally(()=>{if(alive)setLoading(false)})
   return()=>{alive=false}
 },[accessToken,available])
 const connect=async()=>{if(!available||!accessToken||busy)return;setBusy(true);setMessage('')
   try{const result=await startProviderCalendar(accessToken);const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='accounts.google.com')throw new Error('Redirección Google inválida');window.location.assign(url.href)}
   catch(error){setMessage(error instanceof Error?error.message:'No se pudo conectar.');setBusy(false)}
 }
 const disconnect=async()=>{if(!accessToken||busy)return;setBusy(true);setMessage('')
   try{await disconnectProviderCalendar(accessToken);setConnected(false);setEmail(null)}
   catch(error){setMessage(error instanceof Error?error.message:'No se pudo desconectar.')}
   finally{setBusy(false)}
 }
 return <section className="ugo-user-calendar-connect" aria-label="Google Calendar">
  <strong>Google Calendar</strong>
  {!available?<p>La conexión requiere la versión de UGO con servidor de calendario.</p>:loading?<p>Consultando conexión…</p>:
   !configured?<p>Google Calendar todavía no está configurado en el servidor UGO.</p>:
   connected?<><p>Cuenta conectada: {email||'Google Calendar'}</p><button type="button" disabled={busy} onClick={()=>void disconnect()}>Desconectar Google Calendar</button></>:
   <><p>Conectá tu propia cuenta Google. UGO no comparte el calendario entre usuarios.</p><button type="button" disabled={busy} onClick={()=>void connect()}>Conectar Google Calendar</button></>}
  {message&&<p role="alert">{message}</p>}
 </section>
}
