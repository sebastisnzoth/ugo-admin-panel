import { getRoleSupabase } from '../lib/roleSupabase'

type SavedPlace={address:string;label:string}
type AddressRow={etiqueta?:string|null;direccion?:string|null;es_predeterminada?:boolean|null}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}

function normalize(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}

export async function resolveClientSavedAddress(place?:'Casa'|'Trabajo'|null):Promise<SavedPlace|null>{
 try{
  const sb=getRoleSupabase('client'),{data:sess}=await sb.auth.getSession(),user=sess.session?.user
  if(!user)return null
  const[addressResult,profileResult]=await Promise.all([
   sb.from('direcciones_cliente').select('etiqueta,direccion,es_predeterminada').eq('usuario_id',user.id).order('es_predeterminada',{ascending:false}),
   sb.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',user.id).maybeSingle(),
  ])
  const rows=(addressResult.data||[]) as AddressRow[]
  const profile=profileResult.data as ClientProfile|null
  const profileAddress=[profile?.direccion,profile?.barrio,profile?.ciudad].filter(Boolean).join(', ')
  if(place){
   const matcher=place==='Casa'?/casa|hogar|residencia/:/trabajo|oficina|trabalho|escritorio/
   let row=rows.find(item=>matcher.test(normalize(String(item.etiqueta||''))))
   if(!row&&place==='Casa')row=rows.find(item=>Boolean(item.es_predeterminada))
   if(row?.direccion)return{address:String(row.direccion),label:String(row.etiqueta||place)}
   if(place==='Casa'&&profileAddress)return{address:profileAddress,label:'Casa'}
   return null
  }
  const preferred=rows.find(item=>Boolean(item.es_predeterminada))
  if(preferred?.direccion)return{address:String(preferred.direccion),label:String(preferred.etiqueta||'Casa')}
  if(profileAddress)return{address:profileAddress,label:'Casa'}
  if(rows.length===1&&rows[0]?.direccion)return{address:String(rows[0].direccion),label:String(rows[0].etiqueta||'Casa')}
  return null
 }catch{return null}
}
