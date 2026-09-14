import type{SupabaseClient}from'@supabase/supabase-js'

export type ProviderRadarRow={
 id:string
 nombre:string|null
 foto_url:string|null
 karma:number|string|null
 servicios_completados:number|null
 tarifa_base:number|string|null
 online:boolean|null
 disponible:boolean|null
 estado_verificacion:string|null
 categoria_principal_id:string|null
 categoria_nombre:string|null
 categoria_emoji:string|null
 lat:number|null
 lng:number|null
 pais?:string|null
 zona?:string|null
 bio?:string|null
 experiencia_anos?:number|null
 especialidades?:string|null
 idiomas?:string|null
 disponibilidad_horaria?:string|null
 telefono_profesional?:string|null
 ciudad_base?:string|null
}

export type ProviderRadarSnapshot={providers:ProviderRadarRow[];loaded:boolean;error:string|null;updatedAt:number}
type Listener=(snapshot:ProviderRadarSnapshot)=>void

let snapshot:ProviderRadarSnapshot={providers:[],loaded:false,error:null,updatedAt:0}
let inFlight:Promise<ProviderRadarSnapshot>|null=null
const listeners=new Set<Listener>()

function emit(){for(const listener of listeners)listener(snapshot)}

export function getProviderRadarSnapshot(){return snapshot}

export function subscribeProviderRadar(listener:Listener){
 listeners.add(listener)
 listener(snapshot)
 return()=>listeners.delete(listener)
}

export function setProviderRadarRows(rows:ProviderRadarRow[]){
 snapshot={providers:rows,loaded:true,error:null,updatedAt:Date.now()}
 emit()
 return snapshot
}

export function setProviderRadarError(message:string){
 snapshot={...snapshot,loaded:true,error:message,updatedAt:Date.now()}
 emit()
 return snapshot
}

export async function refreshProviderRadar(supabase:SupabaseClient,force=false){
 if(inFlight&&!force)return inFlight
 if(snapshot.loaded&&!force&&Date.now()-snapshot.updatedAt<15_000)return snapshot
 const task=(async()=>{
  const{data,error}=await supabase.from('proveedores_mapa').select('*').order('online',{ascending:false}).order('disponible',{ascending:false}).limit(50)
  if(error)throw error
  return setProviderRadarRows((data||[])as ProviderRadarRow[])
 })()
 inFlight=task
 try{return await task}catch(error){const message=error instanceof Error?error.message:'No pudimos cargar el radar.';setProviderRadarError(message);throw error}finally{if(inFlight===task)inFlight=null}
}

export function providerRadarForCategory(categoryId:string,{onlyAvailable=false}:{onlyAvailable?:boolean}={}){
 return snapshot.providers.filter(provider=>{
  if(provider.categoria_principal_id!==categoryId)return false
  if(onlyAvailable&&!Boolean(provider.online&&provider.disponible))return false
  return true
 })
}
