import{useEffect,useState}from'react'

export type NetworkStatus={online:boolean;restored:boolean}

/**
 * Estado real de conectividad del navegador.
 * `restored` queda encendido unos segundos después de recuperar la conexión
 * para que la shell pueda confirmar visualmente la vuelta a internet y
 * disparar una resincronización de datos.
 */
export function useNetworkStatus(restoredMs=5000):NetworkStatus{
 const[online,setOnline]=useState(()=>typeof navigator==='undefined'?true:navigator.onLine)
 const[restored,setRestored]=useState(false)
 useEffect(()=>{
  let timer:number|undefined
  const goOnline=()=>{if(timer)window.clearTimeout(timer);setOnline(true);setRestored(true);timer=window.setTimeout(()=>{setRestored(false);timer=undefined},restoredMs)}
  const goOffline=()=>{if(timer){window.clearTimeout(timer);timer=undefined}setOnline(false);setRestored(false)}
  window.addEventListener('online',goOnline)
  window.addEventListener('offline',goOffline)
  return()=>{if(timer)window.clearTimeout(timer);window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline)}
 },[restoredMs])
 return{online,restored}
}
