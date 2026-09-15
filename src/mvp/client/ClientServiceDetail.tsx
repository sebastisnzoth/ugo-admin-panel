import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{ClientCompletionReview}from'../ClientCompletionReview'
import{ClientLiveTracking}from'../ClientLiveTracking'
import{DisputeDock}from'../DisputeDock'
import{ServiceChat}from'../ServiceChat'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{STATUS_LABELS}from'../shared'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{useClientFlow}from'./clientFlow'

type DetailRow={id:string;numero:number|string|null;estado:string;descripcion:string|null;direccion_cliente:string|null;programado_para:string|null;created_at:string|null;tarifa:number|string|null;moneda:string|null;proveedor_id:string|null;categoria:{nombre?:string|null;emoji?:string|null}|null;proveedor:{nombre?:string|null;karma?:number|null}|null}
const CANCELLABLE=new Set(['borrador','buscando','ofrecido','asignado','en_camino','llegado'])
const money=(value:number|string|null,moneda:string|null)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:moneda||'BRL'}).format(Number(value||0))
const when=(value:string|null,created:string|null)=>{const raw=value||created;if(!raw)return'Horario por confirmar';const date=new Date(raw);return Number.isNaN(date.getTime())?'Horario por confirmar':date.toLocaleString('es-AR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}

export function ClientServiceDetail({serviceId,onClose}:{serviceId:string;onClose:()=>void}){
 const supabase=useMemo(()=>getRoleSupabase('client'),[]),flow=useClientFlow()
 const[service,setService]=useState<DetailRow|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const load=useCallback(async()=>{setLoading(true);setError('');try{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sesión no disponible.');const{data,error:queryError}=await supabase.from('servicios').select('id,numero,estado,descripcion,direccion_cliente,programado_para,created_at,tarifa,moneda,proveedor_id,categoria:categorias(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma)').eq('id',serviceId).eq('cliente_id',user.id).maybeSingle();if(queryError)throw queryError;if(!data)throw new Error('Este pedido no existe o no pertenece a tu cuenta.');setService(data as unknown as DetailRow)}catch(loadError){setError(loadError instanceof Error?loadError.message:'No pudimos abrir este pedido.')}finally{setLoading(false)}},[serviceId,supabase])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{let alive=true;const resync=()=>{if(alive)void load()};const onVisibility=()=>{if(document.visibilityState==='visible')resync()};window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility);const ch=supabase.channel(`client-service-detail-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`id=eq.${serviceId}`},resync).subscribe(status=>{if(status==='SUBSCRIBED')resync()});return()=>{alive=false;window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[load,serviceId,supabase])
 const cancel=async()=>{if(!service||!CANCELLABLE.has(service.estado)||busy)return;setBusy(true);setNotice('');const ok=await flow.actions.cancelService(service.id);setBusy(false);if(ok){setNotice('Pedido cancelado. Los otros pedidos no fueron modificados.');await load()}else setNotice('No pudimos cancelar este pedido. Su estado actual fue preservado.')}
 return <div className="ugo-client-screen-overlay" role="dialog" aria-modal="true" aria-label="Detalle del pedido"><div className="ugo-client-history-wrap" style={{display:'grid',gap:12}}><button type="button" onClick={onClose} style={{width:44,height:44,borderRadius:14,border:'1px solid #2d4357',background:'#102335',color:'#f6fbff',fontSize:20}} aria-label="Volver a mis pedidos">←</button>
  {loading&&<section className="ugo-history-panel embedded"><div className="ugo-history-empty">Cargando pedido…</div></section>}
  {error&&<section className="ugo-history-panel embedded"><div className="ugo-history-error">{error}</div><button type="button" className="ugo-guided-primary" onClick={()=>void load()}>Reintentar</button></section>}
  {!loading&&!error&&service&&<><section className="ugo-history-panel embedded"><header><div><small>SERVICIO #{service.numero??String(service.id).slice(0,8)}</small><h2>{service.categoria?.emoji||'🧰'} {service.categoria?.nombre||'Servicio UGO'}</h2><p>{service.descripcion||'Sin descripción adicional.'}</p></div><span className={`state-${service.estado}`}>{STATUS_LABELS[service.estado]||service.estado}</span></header><div className="ugo-history-meta"><div><small>{service.programado_para?'PROGRAMADO':'CREADO'}</small><b>{when(service.programado_para,service.created_at)}</b></div><div><small>PROVEEDOR</small><b>{service.proveedor?.nombre||'Todavía sin asignar'}</b></div><div><small>DIRECCIÓN</small><b>{service.direccion_cliente||'Por confirmar'}</b></div><div><small>IMPORTE</small><b>{money(service.tarifa,service.moneda)}</b></div></div>{notice&&<div className="ugo-history-action-notice" role="status">{notice}</div>}{CANCELLABLE.has(service.estado)&&<div className="ugo-history-row-actions"><button type="button" className="ugo-history-cancel-button" disabled={busy} onClick={()=>void cancel()}>{busy?'Cancelando…':'Cancelar este pedido'}</button></div>}</section><ClientLiveTracking serviceId={service.id}/><ClientPaymentChoice serviceId={service.id}/><ServiceChat role="client" serviceId={service.id} compact/><ServiceExpansionPanel role="client" serviceId={service.id} compact/><ClientCompletionReview serviceId={service.id}/><DisputeDock role="client" serviceId={service.id}/></>}
 </div></div>
}

export default ClientServiceDetail
