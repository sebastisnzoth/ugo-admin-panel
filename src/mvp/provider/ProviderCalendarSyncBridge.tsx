import{useEffect}from'react'
import{useProviderData}from'./providerData'
import{syncProviderCalendar}from'./providerCalendar'

export function ProviderCalendarSyncBridge(){
 const data=useProviderData()
 useEffect(()=>{if(!data.accessToken)return;let alive=true,running=false
  const run=async()=>{if(!alive||running||!navigator.onLine)return;running=true;try{await syncProviderCalendar(data.accessToken)}catch{}finally{running=false}}
  const onOnline=()=>void run(),onVisible=()=>{if(document.visibilityState==='visible')void run()}
  void run();const timer=window.setInterval(()=>void run(),5*60*1000);window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisible)
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisible)}
 },[data.accessToken,data.service?.id,data.service?.estado])
 return null
}
