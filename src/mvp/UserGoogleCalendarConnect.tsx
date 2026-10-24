import React,{useEffect,useRef,useState}from'react'
import{useLocale}from'../i18n/locale'
import{getProviderCalendarStatus,startProviderCalendar,disconnectProviderCalendar,isCalendarApiHostSupported}from'./provider/providerCalendar'

// A connection belongs to the authenticated UGO user, never to a shared account.
// A functioning calendar API requires the Vercel serverless runtime.
const copies={
 'pt-BR':{unavailable:'A conexão requer a versão do UGO com servidor de calendário.',loading:'Verificando conexão…',unconfigured:'Google Calendar ainda não está configurado no servidor UGO.',connected:'Conta conectada:',disconnect:'Desconectar Google Calendar',about:'Conecte sua conta Google. O UGO não compartilha calendários entre usuários.',connect:'Conectar Google Calendar'},
 es:{unavailable:'La conexión requiere la versión de UGO con servidor de calendario.',loading:'Consultando conexión…',unconfigured:'Google Calendar todavía no está configurado en el servidor UGO.',connected:'Cuenta conectada:',disconnect:'Desconectar Google Calendar',about:'Conectá tu propia cuenta Google. UGO no comparte calendarios entre usuarios.',connect:'Conectar Google Calendar'},
 en:{unavailable:'Connection requires UGO with its calendar server.',loading:'Checking connection…',unconfigured:'Google Calendar is not configured on the UGO server.',connected:'Connected account:',disconnect:'Disconnect Google Calendar',about:'Connect your own Google account. UGO does not share calendars between users.',connect:'Connect Google Calendar'}
} as const
export function UserGoogleCalendarConnect({accessToken}:{accessToken:string}){
 const{locale}=useLocale()
 const labels=copies[locale as keyof typeof copies]||copies['pt-BR']
 const tokenRef=useRef(accessToken);tokenRef.current=accessToken
 const[loadedToken,setLoadedToken]=useState('')
 const[connected,setConnected]=useState(false),[email,setEmail]=useState<string|null>(null)
 const[configured,setConfigured]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const available=typeof window!=='undefined'&&isCalendarApiHostSupported(window.location.hostname,import.meta.env.DEV)
 useEffect(()=>{
   let alive=true
   // A role/account switch must never display the previous user's calendar email.
   setLoadedToken('');setConnected(false);setEmail(null);setConfigured(false);setMessage('');setBusy(false)
   if(!available||!accessToken){setLoading(false);return()=>{alive=false}}
   setLoading(true)
   const isCurrent=()=>alive&&tokenRef.current===accessToken
   void getProviderCalendarStatus(accessToken).then(result=>{
     if(isCurrent()){setConfigured(result.configured);setConnected(result.connected);setEmail(result.email)}
   }).catch(error=>{if(isCurrent())setMessage(error instanceof Error?error.message:'No se pudo consultar Google Calendar.')})
     .finally(()=>{if(isCurrent()){setLoadedToken(accessToken);setLoading(false)}})
   return()=>{alive=false}
 },[accessToken,available])
 const connect=async()=>{if(!available||!accessToken||busy)return;setBusy(true);setMessage('')
   try{const result=await startProviderCalendar(accessToken);const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='accounts.google.com')throw new Error('Redirección Google inválida');window.location.assign(url.href)}
   catch(error){setMessage(error instanceof Error?error.message:'No se pudo conectar.');setBusy(false)}
 }
 const disconnect=async()=>{if(!accessToken||busy)return;setBusy(true);setMessage('')
   try{await disconnectProviderCalendar(accessToken);if(tokenRef.current===accessToken){setConnected(false);setEmail(null)}}
   catch(error){setMessage(error instanceof Error?error.message:'No se pudo desconectar.')}
   finally{setBusy(false)}
 }
 return <section className="ugo-user-calendar-connect" aria-label="Google Calendar">
  <strong>Google Calendar</strong>
  {!available?<p>{labels.unavailable}</p>:loading||loadedToken!==accessToken?<p>{labels.loading}</p>:
   !configured?<p>{labels.unconfigured}</p>:
   connected?<><p>{labels.connected} {email||'Google Calendar'}</p><button type="button" disabled={busy} onClick={()=>void disconnect()}>{labels.disconnect}</button></>:
   <><p>{labels.about}</p><button type="button" disabled={busy} onClick={()=>void connect()}>{labels.connect}</button></>}
  {message&&<p role="alert">{message}</p>}
 </section>
}
