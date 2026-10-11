import{useEffect,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import{getRoutingProvider}from'../../../lib/routing/provider'

type TrackingRow={provider_lat:number|null;provider_lng:number|null;client_lat:number|null;client_lng:number|null;provider_updated_at:string|null}
type TrackingRpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>}

export type ClientOrderEta={etaMinutes:number|null;updatedAt:string|null;providerLocated:boolean}

const validPoint=(lat:unknown,lng:unknown)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))
const REFRESH_MS=20_000

/**
 * ETA del profesional para el pedido activo, leyendo la misma fuente persistida
 * que el seguimiento (`obtener_tracking_servicio_cliente`). Es una mejora del
 * home: cualquier fallo se resuelve en silencio y nunca bloquea la pantalla.
 */
export function useClientOrderEta(supabase:SupabaseClient,serviceId:string|null):ClientOrderEta{
 const[state,setState]=useState<ClientOrderEta>({etaMinutes:null,updatedAt:null,providerLocated:false})
 useEffect(()=>{
  if(!serviceId){queueMicrotask(()=>setState({etaMinutes:null,updatedAt:null,providerLocated:false}));return}
  let disposed=false
  const rpc=supabase as unknown as TrackingRpcClient
  const load=async()=>{
   try{
    const{data,error}=await rpc.rpc('obtener_tracking_servicio_cliente',{p_servicio_id:serviceId})
    if(disposed)return
    const raw=Array.isArray(data)?data[0]:data
    const row=(raw||null)as TrackingRow|null
    if(error||!row){setState(previous=>({...previous,providerLocated:false}));return}
    const hasProvider=validPoint(row.provider_lat,row.provider_lng),hasClient=validPoint(row.client_lat,row.client_lng)
    if(!hasProvider||!hasClient){setState(previous=>({...previous,providerLocated:hasProvider,etaMinutes:hasProvider?previous.etaMinutes:null,updatedAt:row.provider_updated_at||previous.updatedAt}));return}
    const route=await getRoutingProvider().route({latitude:Number(row.provider_lat),longitude:Number(row.provider_lng)},{latitude:Number(row.client_lat),longitude:Number(row.client_lng)})
    if(disposed)return
    setState({etaMinutes:Math.max(1,Math.round(route.durationSeconds/60)),updatedAt:row.provider_updated_at||null,providerLocated:true})
   }catch{/* El ETA es una mejora: si falla, el home sigue mostrando el estado persistido. */}
  }
  void load()
  const timer=window.setInterval(()=>void load(),REFRESH_MS)
  return()=>{disposed=true;window.clearInterval(timer)}
 },[serviceId,supabase])
 return state
}
