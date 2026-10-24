import{useEffect,useRef}from'react'
import{getProviderCalendarStatus,syncProviderCalendar,isCalendarApiHostSupported}from'../../../mvp/provider/providerCalendar'

// The Calendar API exists on the serverless host, not on Vite or static Pages.
export function isProviderCalendarAutoSyncHostSupported(){
 return typeof window!=='undefined'&&isCalendarApiHostSupported(window.location.hostname,import.meta.env.DEV)
}

export function useProviderCalendarAutoSync(accessToken:string,serviceId?:string|null,serviceState?:string|null){
 const tokenRef=useRef(accessToken)
 tokenRef.current=accessToken
 // Avoid syncing for every logged-in provider who has never connected Calendar.
 // Cache by access token so an account switch cannot inherit the old connection.
 const statusRef=useRef<{token:string;connected:boolean}|null>(null)
 const hasToken=Boolean(accessToken)
 useEffect(()=>{
  if(!hasToken){statusRef.current=null;return}
  let alive=true,running=false
  const run=async()=>{
   if(!alive||running||!navigator.onLine||!isProviderCalendarAutoSyncHostSupported())return
   const token=tokenRef.current
   if(!token)return
   running=true
   try{
    let status=statusRef.current
    if(status?.token!==token){
     const remote=await getProviderCalendarStatus(token)
     if(!alive||tokenRef.current!==token)return
     status={token,connected:Boolean(remote.configured&&remote.connected)}
     statusRef.current=status
    }
    if(!status.connected)return
    const result=await syncProviderCalendar(token)
    if(!alive||tokenRef.current!==token)return
    if(!result.configured||!result.connected)statusRef.current={token,connected:false}
   }catch{/* Optional Calendar failures must never affect Auth, matching or GPS. */}
   finally{running=false}
  }
  const onOnline=()=>void run()
  const onVisible=()=>{if(document.visibilityState==='visible')void run()}
  void run()
  const timer=window.setInterval(()=>void run(),5*60*1000)
  window.addEventListener('online',onOnline)
  document.addEventListener('visibilitychange',onVisible)
  return()=>{
   alive=false
   window.clearInterval(timer)
   window.removeEventListener('online',onOnline)
   document.removeEventListener('visibilitychange',onVisible)
  }
 },[hasToken,serviceId,serviceState])
}
