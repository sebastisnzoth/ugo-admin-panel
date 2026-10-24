import{useEffect,useRef}from'react'
import{syncProviderCalendar}from'../../../mvp/provider/providerCalendar'
// Optional calendar API is a Vercel serverless rewrite, not part of the Vite dev
// server or static GitHub Pages. Never generate noisy 404 requests in those hosts.
// On supported Vercel/custom hosts the normal sync and error handling is unchanged.
export function isProviderCalendarAutoSyncHostSupported(){
 if(import.meta.env.DEV)return false
 if(typeof window!=='undefined'&&window.location.hostname.endsWith('.github.io'))return false
 return true
}
export function useProviderCalendarAutoSync(accessToken:string,serviceId?:string|null,serviceState?:string|null){const tokenRef=useRef(accessToken);tokenRef.current=accessToken;const hasToken=Boolean(accessToken);useEffect(()=>{if(!hasToken)return;let alive=true,running=false;const run=async()=>{if(!alive||running||!navigator.onLine||!isProviderCalendarAutoSyncHostSupported())return;running=true;try{await syncProviderCalendar(tokenRef.current)}catch{/* vacío intencional */}finally{running=false}},onOnline=()=>void run(),onVisible=()=>{if(document.visibilityState==='visible')void run()};void run();const timer=window.setInterval(()=>void run(),5*60*1000);window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisible);return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisible)}},[hasToken,serviceId,serviceState])}
