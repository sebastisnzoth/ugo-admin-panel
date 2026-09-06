import{useCallback,useEffect,useState}from'react'
import{supabase as adminSupabase}from'../lib/supabase'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'

export type DisputeRow={id:string;numero?:number|null;servicio_id:string;cliente_id?:string|null;proveedor_id?:string|null;abierta_por:string;estado:string;motivo:string;monto_disputado?:number|null;resolucion?:string|null;resolucion_favor?:'cliente'|'proveedor'|null;created_at:string;resuelta_at?:string|null;clientes?:{nombre?:string|null}|null;proveedores?:{nombre?:string|null}|null}
export type DisputeMessage={id:number;disputa_id:string;autor_id:string;autor_rol:'cliente'|'proveedor'|'admin';mensaje:string;created_at:string}

export function useAdminDisputes(){
 const[disputes,setDisputes]=useState<DisputeRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)
 const refetch=useCallback(async()=>{setLoading(true);setError(null);const{data,error:e}=await(adminSupabase as any).from('disputas').select('id,numero,servicio_id,cliente_id,proveedor_id,abierta_por,estado,motivo,monto_disputado,resolucion,resolucion_favor,created_at,resuelta_at,clientes:usuarios!disputas_cliente_id_fkey(nombre),proveedores:usuarios!disputas_proveedor_id_fkey(nombre)').in('estado',['abierta','en_revision']).order('created_at',{ascending:true});if(e)setError(e.message);else setDisputes((data||[])as DisputeRow[]);setLoading(false)},[])
 const resolverDisputa=useCallback(async(id:string,resolucion:string,favorDe:'cliente'|'proveedor')=>{const{error}=await(adminSupabase as any).rpc('admin_resolver_disputa',{p_disputa_id:id,p_resolucion:resolucion,p_favor_de:favorDe});if(error)throw error;await refetch()},[refetch])
 useEffect(()=>{void refetch();const ch=(adminSupabase as any).channel('ugo-admin-disputes').on('postgres_changes',{event:'*',schema:'public',table:'disputas'},refetch).on('postgres_changes',{event:'*',schema:'public',table:'disputa_mensajes'},refetch).subscribe();return()=>{(adminSupabase as any).removeChannel(ch)}},[refetch])
 return{disputes,loading,error,refetch,resolverDisputa}
}

export function useParticipantDispute(role:UgoRole){
 const sb=getRoleSupabase(role) as any
 const[userId,setUserId]=useState<string|null>(null),[service,setService]=useState<any|null>(null),[dispute,setDispute]=useState<DisputeRow|null>(null),[messages,setMessages]=useState<DisputeMessage[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)
 const load=useCallback(async()=>{setLoading(true);setError(null);const{data:{session}}=await sb.auth.getSession();const uid=session?.user?.id||null;setUserId(uid);if(!uid){setService(null);setDispute(null);setMessages([]);setLoading(false);return}
  const allowed=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado'];let q=sb.from('servicios').select('id,numero,estado,tarifa,cliente_id,proveedor_id,descripcion').in('estado',allowed).order('created_at',{ascending:false}).limit(1);q=role==='client'?q.eq('cliente_id',uid):q.eq('proveedor_id',uid);const{data:s,error:se}=await q.maybeSingle();if(se){setError(se.message);setLoading(false);return}setService(s||null);if(!s){setDispute(null);setMessages([]);setLoading(false);return}
  const{data:d,error:de}=await sb.from('disputas').select('id,numero,servicio_id,cliente_id,proveedor_id,abierta_por,estado,motivo,monto_disputado,resolucion,resolucion_favor,created_at,resuelta_at').eq('servicio_id',s.id).maybeSingle();if(de){setError(de.message);setLoading(false);return}setDispute(d||null);if(d){const{data:m}=await sb.from('disputa_mensajes').select('id,disputa_id,autor_id,autor_rol,mensaje,created_at').eq('disputa_id',d.id).order('created_at');setMessages((m||[])as DisputeMessage[])}else setMessages([]);setLoading(false)},[role,sb])
 const open=useCallback(async(motivo:string)=>{if(!service)throw new Error('No hay servicio elegible');const{error}=await sb.rpc('abrir_disputa',{p_servicio_id:service.id,p_motivo:motivo,p_evidencias:[]});if(error)throw error;await load()},[service,sb,load])
 const reply=useCallback(async(mensaje:string)=>{if(!dispute)throw new Error('No hay disputa abierta');const{error}=await sb.rpc('responder_disputa',{p_disputa_id:dispute.id,p_mensaje:mensaje,p_evidencias:[]});if(error)throw error;await load()},[dispute,sb,load])
 useEffect(()=>{void load();const ch=sb.channel(`ugo-dispute-${role}`).on('postgres_changes',{event:'*',schema:'public',table:'disputas'},load).on('postgres_changes',{event:'*',schema:'public',table:'disputa_mensajes'},load).on('postgres_changes',{event:'*',schema:'public',table:'servicios'},load).subscribe();return()=>{sb.removeChannel(ch)}},[load,role,sb])
 return{userId,service,dispute,messages,loading,error,refetch:load,open,reply}
}
