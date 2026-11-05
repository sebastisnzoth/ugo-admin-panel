import React,{useEffect,useRef,useState}from'react'
import{useLocale}from'../i18n/locale'
import{getProviderCalendarStatus,startProviderCalendar,disconnectProviderCalendar,isCalendarApiHostSupported}from'./provider/providerCalendar'

// A connection belongs to the authenticated UGO user, never to a shared account.
// A functioning calendar API requires the Vercel serverless runtime.
const copies={
 'pt-BR':{unavailable:'A conexão requer a versão do UGO com servidor de calendário.',loading:'Verificando conexão…',unconfigured:'Google Calendar ainda não está configurado no servidor UGO.',connected:'Conta conectada:',disconnect:'Desconectar Google Calendar',about:'Conecte sua conta Google. O UGO não compartilha calendários entre usuários.',connect:'Conectar Google Calendar',clientInfo:'A conexão autoriza o acesso aos eventos do calendário. No perfil de cliente, os pedidos não são sincronizados automaticamente.',notConnected:'Não conectado',statusError:'Não foi possível consultar a conexão.',retry:'Tentar novamente'},
 es:{unavailable:'La conexión requiere la versión de UGO con servidor de calendario.',loading:'Consultando conexión…',unconfigured:'Google Calendar todavía no está configurado en el servidor UGO.',connected:'Cuenta conectada:',disconnect:'Desconectar Google Calendar',about:'Conectá tu propia cuenta Google. UGO no comparte calendarios entre usuarios.',connect:'Conectar Google Calendar',clientInfo:'La conexión autoriza el acceso a los eventos del calendario. Los pedidos del cliente no se sincronizan automáticamente.',notConnected:'No conectado',statusError:'No pudimos consultar la conexión.',retry:'Reintentar'},
 en:{unavailable:'Connection requires UGO with its calendar server.',loading:'Checking connection…',unconfigured:'Google Calendar is not configured on the UGO server.',connected:'Connected account:',disconnect:'Disconnect Google Calendar',about:'Connect your own Google account. UGO does not share calendars between users.',connect:'Connect Google Calendar',clientInfo:'Connecting grants access to calendar events. Client requests are not automatically synchronized.',notConnected:'Not connected',statusError:'Could not check the connection.',retry:'Retry'}
} as const
export function UserGoogleCalendarConnect({accessToken,client=false}:{accessToken:string;client?:boolean}){
 const{locale}=useLocale()
 const labels=copies[locale as keyof typeof copies]||copies['pt-BR']
 const tokenRef=useRef(accessToken);tokenRef.current=accessToken
 const[loadedToken,setLoadedToken]=useState(''),[statusError,setStatusError]=useState(false),[retryCount,setRetryCount]=useState(0)
 const[connected,setConnected]=useState(false),[email,setEmail]=useState<string|null>(null)
 const[configured,setConfigured]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const available=typeof window!=='undefined'&&isCalendarApiHostSupported(window.location.hostname,import.meta.env.DEV)
 useEffect(()=>{
   let alive=true
   // A role/account switch must never display the previous user's calendar email.
   setLoadedToken('');setConnected(false);setEmail(null);setStatusError(false);setConfigured(false);setMessage('');setBusy(false)
   if(!available||!accessToken){setLoading(false);return()=>{alive=false}}
   setLoading(true)
   const isCurrent=()=>alive&&tokenRef.current===accessToken
   void getProviderCalendarStatus(accessToken).then(result=>{
     if(isCurrent()){setConfigured(result.configured);setConnected(result.connected);setEmail(result.email)}
   }).catch(()=>{if(isCurrent())setStatusError(true)})
     .finally(()=>{if(isCurrent()){setLoadedToken(accessToken);setLoading(false)}})
   return()=>{alive=false}
 },[accessToken,available,retryCount])
 // OAuth and disconnect responses may arrive after an account switch. Never redirect
 // to a previous user's OAuth flow or publish their action errors in the new session.
 const connect=async()=>{if(!available||!accessToken||busy)return;setBusy(true);setMessage('')
   try{
     const result=await startProviderCalendar(accessToken)
     if(tokenRef.current!==accessToken)return
     const url=new URL(result.url)
     if(url.protocol!=='https:'||url.hostname!=='accounts.google.com')throw new Error('Redirección Google inválida')
     window.location.assign(url.href)
   }catch(error){if(tokenRef.current===accessToken)setMessage(error instanceof Error?error.message:'No se pudo conectar.')}
   finally{if(tokenRef.current===accessToken)setBusy(false)}
 }
 const disconnect=async()=>{if(!accessToken||busy)return;setBusy(true);setMessage('')
   try{await disconnectProviderCalendar(accessToken);if(tokenRef.current===accessToken){setConnected(false);setEmail(null)}}
   catch(error){if(tokenRef.current===accessToken)setMessage(error instanceof Error?error.message:'No se pudo desconectar.')}
   finally{if(tokenRef.current===accessToken)setBusy(false)}
 }
 return <section className="ugo-user-calendar-connect" aria-label="Google Calendar">
  <strong>Google Calendar</strong>
  {client&&<p>{labels.clientInfo}</p>}
  {!available?<p>{labels.unavailable}</p>:loading||loadedToken!==accessToken?<p>{labels.loading}</p>:
   statusError?<><p role="alert">{labels.statusError}</p><button type="button" onClick={()=>setRetryCount(value=>value+1)}>{labels.retry}</button></>:
   !configured?<p>{labels.unconfigured}</p>:
   connected?<><p>{labels.connected} {email||'Google Calendar'}</p><button type="button" disabled={busy} onClick={()=>void disconnect()}>{labels.disconnect}</button></>:
   <><p><strong>{labels.notConnected}</strong> · {labels.about}</p><button type="button" disabled={busy} onClick={()=>void connect()}>{labels.connect}</button></>}
  {message&&<p role="alert">{message}</p>}
 </section>
}
