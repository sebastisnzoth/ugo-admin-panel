import React,{useCallback,useEffect,useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'

type ActiveService={id:string;numero:number|null;estado:string;descripcion:string|null;created_at:string;categoria:{nombre:string|null;emoji:string|null}|null;proveedor:{nombre:string|null}|null}
const STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','esperando_pago']
const STATE_TEXT:Record<string,string>={buscando:'Buscando un profesional',ofrecido:'Buscando un profesional',asignado:'Profesional asignado',en_camino:'Profesional en camino',llegado:'Profesional en el lugar',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando tu aprobación',esperando_pago:'Esperando confirmación de pago'}
export function ClientZipActive({openService}:{openService:(id:string)=>void}){
 const{session,supabase}=useRoleSession('client'),flow=useClientFlow()
 const[services,setServices]=useState<ActiveService[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const fetchServices=useCallback(async()=>{
  if(!session){setServices([]);setLoading(false);return}
  setLoading(true)
  const{data,error:loadError}=await supabase.from('servicios').select('id,numero,estado,descripcion,created_at,categoria:categorias(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('cliente_id',session.user.id).in('estado',STATES).order('created_at',{ascending:false}).limit(12)
  setLoading(false)
  if(loadError){setError('No pudimos consultar los servicios. Reintentá.');return}
  setError('');setServices((data||[]) as unknown as ActiveService[])
 },[session,supabase])
 useEffect(()=>{void fetchServices()},[fetchServices])
 useEffect(()=>{
  if(!session)return
  const channel=supabase.channel('ugo-zip-active-'+session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:'cliente_id=eq.'+session.user.id},()=>void fetchServices()).subscribe()
  return()=>{void supabase.removeChannel(channel)}
 },[session,supabase,fetchServices])
 return <main className="ugo-zip-active-page" aria-label="Servicio en curso">
  <section className="ugo-zip-section-title"><div><span>SEGUIMIENTO EN VIVO</span><h2>Mis servicios en curso</h2><p>Estados auténticos de tus pedidos. El seguimiento se actualiza desde UGO.</p></div><button type="button" onClick={()=>void fetchServices()}>↻ Actualizar</button></section>
  {loading&&<div role="status" className="ugo-zip-empty">Cargando tus servicios…</div>}
  {error&&<div role="alert" className="ugo-zip-notice">{error}</div>}
  {!loading&&!error&&services.length===0&&<div className="ugo-zip-empty"><span>⌖</span><h3>Todavía no tenés un servicio activo</h3><p>Elegí lo que necesitás y UGO buscará un profesional que pueda ayudarte.</p><button type="button" onClick={()=>flow.navigate('request')}>Solicitar un servicio →</button></div>}
  {!loading&&services.length>0&&<div className="ugo-zip-active-list">{services.map(s=><article key={s.id} className="ugo-zip-active-card">
   <div className="ugo-zip-active-head"><span className="ugo-zip-service-icon">{s.categoria?.emoji||'🧰'}</span><div><small>PEDIDO #{s.numero??s.id.slice(0,8)}</small><h3>{s.categoria?.nombre||'Servicio UGO'}</h3></div><span className="ugo-zip-status">{STATE_TEXT[s.estado]||s.estado}</span></div>
   <p>{s.descripcion||'Sin descripción adicional'}</p>
   <div className="ugo-zip-timeline" aria-label="Progreso de tu servicio"><span className="done">Pedido recibido</span><span className={['buscando','ofrecido'].includes(s.estado)?'':'done'}>Profesional asignado</span><span className={['en_progreso','esperando_aprobacion','esperando_pago'].includes(s.estado)?'done':''}>Trabajo</span><span className={['esperando_aprobacion','esperando_pago'].includes(s.estado)?'done':''}>Cierre</span></div>
   {s.proveedor?.nombre&&<p><strong>Profesional:</strong> {s.proveedor.nombre}</p>}
   <button type="button" onClick={()=>openService(s.id)}>Ver detalles y acciones →</button>
  </article>)}</div>}
 </main>
}
