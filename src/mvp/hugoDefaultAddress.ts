import { getRoleSupabase } from '../lib/roleSupabase'

type SavedPlace={address:string;label:string;latitude:number|null;longitude:number|null}
type AddressRow={etiqueta?:string|null;direccion?:string|null;es_predeterminada?:boolean|null;latitud?:number|string|null;longitud?:number|string|null}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}

function normalize(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}

export async function resolveClientSavedAddress(place?:'Casa'|'Trabajo'|null):Promise<SavedPlace|null>{
 try{
  const sb=getRoleSupabase('client'),{data:sess}=await sb.auth.getSession(),user=sess.session?.user
  if(!user)return null
  const[addressResult,profileResult]=await Promise.all([
   sb.from('direcciones_cliente').select('etiqueta,direccion,es_predeterminada,latitud,longitud').eq('usuario_id',user.id).order('es_predeterminada',{ascending:false}),
   sb.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',user.id).maybeSingle(),
  ])
  const rows=(addressResult.data||[]) as AddressRow[]
  const profile=profileResult.data as ClientProfile|null
  const profileAddress=[profile?.direccion,profile?.barrio,profile?.ciudad].filter(Boolean).join(', ')
  if(place){
   const matcher=place==='Casa'?/casa|hogar|residencia/:/trabajo|oficina|trabalho|escritorio/
   let row=rows.find(item=>matcher.test(normalize(String(item.etiqueta||''))))
   if(!row&&place==='Casa')row=rows.find(item=>Boolean(item.es_predeterminada))
   if(row?.direccion)return{address:String(row.direccion),label:String(row.etiqueta||place),latitude:Number.isFinite(Number(row.latitud))?Number(row.latitud):null,longitude:Number.isFinite(Number(row.longitud))?Number(row.longitud):null}
   if(place==='Casa'&&profileAddress)return{address:profileAddress,label:'Casa',latitude:null,longitude:null}
   return null
  }
  const preferred=rows.find(item=>Boolean(item.es_predeterminada))
  if(preferred?.direccion)return{address:String(preferred.direccion),label:String(preferred.etiqueta||'Casa'),latitude:Number.isFinite(Number(preferred.latitud))?Number(preferred.latitud):null,longitude:Number.isFinite(Number(preferred.longitud))?Number(preferred.longitud):null}
  if(profileAddress)return{address:profileAddress,label:'Casa',latitude:null,longitude:null}
  if(rows.length===1&&rows[0]?.direccion)return{address:String(rows[0].direccion),label:String(rows[0].etiqueta||'Casa'),latitude:Number.isFinite(Number(rows[0].latitud))?Number(rows[0].latitud):null,longitude:Number.isFinite(Number(rows[0].longitud))?Number(rows[0].longitud):null}
  return null
 }catch{return null}
}
