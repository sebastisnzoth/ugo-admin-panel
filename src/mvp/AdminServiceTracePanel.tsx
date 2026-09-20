import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{AdminServiceExtendedTrace}from'./AdminServiceExtendedTrace'

type Service={
 id:string;numero?:number|string|null;cliente_id?:string|null;proveedor_id?:string|null;estado?:string|null;
 created_at?:string|null;updated_at?:string|null;programado_para?:string|null;aceptado_at?:string|null;iniciado_at?:string|null;completado_at?:string|null;cancelado_at?:string|null;
 metadata?:Record<string,unknown>|null;cliente?:{id?:string;nombre?:string|null;apellido?:string|null}|null;proveedor?:{id?:string;nombre?:string|null;apellido?:string|null}|null
}
type Evidence={id:string;kind:'solicitud'|'servicio';tipo:string;storage_path:string;descripcion:string|null;created_at:string;usuario_id?:string|null;url?:string|null}
type StateEvent={id:string;actor_id:string|null;actor_role:string;estado_anterior:string|null;estado_nuevo:string;motivo:string|null;created_at:string}
type LegacyEvent={id:number|string;actor_id:string|null;evento:string;estado_anterior:string|null;estado_nuevo:string|null;detalles:Record<string,unknown>|null;created_at:string}
type Payment={id:string;estado:string;metodo:string|null;modelo_pago:string|null;monto_bruto:number|null;comision_ugo:number|null;ganancia_proveedor:number|null;moneda:string|null;created_at:string;updated_at:string|null;autorizado_at:string|null;liberado_at:string|null;reembolsado_at:string|null;fecha_confirmacion:string|null;pix_informado_at:string|null;pix_conciliado_at:string|null}
type CashDebt={id:string;pago_id:string;comision_ugo:number;monto_pagado_ugo:number;saldo_pendiente:number;moneda:string;estado:string;referencia_pago:string|null;pago_informado_at:string|null;pagado_at:string|null;created_at:string}
type Review={id:string;autor_tipo:string;puntuacion:number;comentario:string|null;created_at:string;cliente_id:string;proveedor_id:string}
const stateLabel=(s?:string|null)=>({borrador:'Pedido creado',buscando:'Buscando profesional',ofrecido:'Oferta enviada',asignado:'Profesional asignado',en_camino:'Proveedor en camino',llegado:'Proveedor llegó',en_progreso:'Trabajo iniciado',esperando_aprobacion:'Trabajo listo / esperando aprobación',completado:'Servicio completado',cancelado:'Servicio cancelado',disputado:'Servicio en disputa'} as Record<string,string>)[String(s||'')]||String(s||'Evento')
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'
const money=(v:number|null,currency:string|null)=>{try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:String(currency||'BRL')}).format(Number(v||0))}catch{return`R$ ${Number(v||0).toFixed(2)}`}}
const name=(p?:{nombre?:string|null;apellido?:string|null}|null)=>[p?.nombre,p?.apellido].filter(Boolean).join(' ')||'—'

export function AdminServiceTracePanel({service}:{service:Service}){
 const[loading,setLoading]=useState(true),[error,setError]=useState(''),[evidence,setEvidence]=useState<Evidence[]>([]),[events,setEvents]=useState<StateEvent[]>([]),[legacyEvents,setLegacyEvents]=useState<LegacyEvent[]>([]),[payments,setPayments]=useState<Payment[]>([]),[debts,setDebts]=useState<CashDebt[]>([]),[reviews,setReviews]=useState<Review[]>([]),[actors,setActors]=useState<Record<string,string>>({})
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const[{data:req,error:reqError},{data:work,error:workError},{data:eventRows,error:eventError},{data:legacyRows,error:legacyError},{data:paymentRows,error:paymentError},{data:debtRows,error:debtError},{data:reviewRows,error:reviewError}]=await Promise.all([
    (supabase as any).from('evidencias_solicitud').select('id,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at,usuario_id').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('servicio_estado_eventos').select('id,actor_id,actor_role,estado_anterior,estado_nuevo,motivo,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('eventos_servicio').select('id,actor_id,evento,estado_anterior,estado_nuevo,detalles,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('pagos').select('id,estado,metodo,modelo_pago,monto_bruto,comision_ugo,ganancia_proveedor,moneda,created_at,updated_at,autorizado_at,liberado_at,reembolsado_at,fecha_confirmacion,pix_informado_at,pix_conciliado_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('deudas_ugo_proveedor').select('id,pago_id,comision_ugo,monto_pagado_ugo,saldo_pendiente,moneda,estado,referencia_pago,pago_informado_at,pagado_at,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('resenas').select('id,autor_tipo,puntuacion,comentario,created_at,cliente_id,proveedor_id').eq('servicio_id',service.id).order('created_at',{ascending:true})
   ])
   const firstError=reqError||workError||eventError||legacyError||paymentError||debtError||reviewError;if(firstError)throw firstError
   const requestEvidence:Evidence[]=await Promise.all(((req||[])as any[]).map(async row=>{const{data}=await supabase.storage.from('request-evidence').createSignedUrl(row.storage_path,1800);return{id:row.id,kind:'solicitud',tipo:'pedido',storage_path:row.storage_path,descripcion:row.descripcion,created_at:row.created_at,url:data?.signedUrl||null}}))
   const serviceEvidence:Evidence[]=await Promise.all(((work||[])as any[]).map(async row=>{const{data}=await supabase.storage.from('service-evidence').createSignedUrl(row.storage_path,1800);return{...row,kind:'servicio',url:data?.signedUrl||null}}))
   const eventList=(eventRows||[])as StateEvent[]
   const legacyList=(legacyRows||[])as LegacyEvent[]
   const actorIds=Array.from(new Set([...eventList.map(e=>e.actor_id),...legacyList.map(e=>e.actor_id)].filter(Boolean))) as string[]
   if(actorIds.length){const{data:userRows}=await (supabase as any).from('usuarios').select('id,nombre,apellido').in('id',actorIds);setActors(Object.fromEntries((userRows||[]).map((u:any)=>[u.id,[u.nombre,u.apellido].filter(Boolean).join(' ')||u.id.slice(0,8)])))}else setActors({})
   setEvidence([...requestEvidence,...serviceEvidence].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()))
   setEvents(eventList);setLegacyEvents(legacyList);setPayments((paymentRows||[])as Payment[]);setDebts((debtRows||[])as CashDebt[]);setReviews((reviewRows||[])as Review[])
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la trazabilidad completa del servicio.')}finally{setLoading(false)}
 },[service.id])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{
  let alive=true
  const sync=()=>{if(alive)void load()}
  const onVisibility=()=>{if(document.visibilityState==='visible')sync()}
  const onOnline=()=>sync()
  window.addEventListener('online',onOnline)
  document.addEventListener('visibilitychange',onVisibility)
  let channel:any=supabase.channel(`admin-trace-live-${service.id}-${Date.now()}`)
  const scoped=['servicio_estado_eventos','eventos_servicio','pagos','deudas_ugo_proveedor','resenas','evidencias_solicitud','evidencias_servicio']
  for(const table of scoped)channel=channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`servicio_id=eq.${service.id}`},sync)
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`id=eq.${service.id}`},sync)
  channel.subscribe((status:string)=>{if(status==='SUBSCRIBED')sync();if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')window.setTimeout(sync,1200)})
  const fallback=window.setInterval(()=>{if(document.visibilityState==='visible')sync()},15000)
  return()=>{alive=false;window.clearInterval(fallback);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(channel)}
 },[load,service.id])

 const timeline=useMemo(()=>{
  const rows:{key:string;at:string;title:string;detail:string;role?:string}[]=[]
  if(service.created_at)rows.push({key:'created',at:service.created_at,title:'Pedido creado',detail:`Cliente: ${name(service.cliente)}`,role:'cliente'})
  if(service.programado_para)rows.push({key:'scheduled',at:service.programado_para,title:'Horario solicitado / programado',detail:'Fecha prevista para el servicio',role:'sistema'})
  if(service.aceptado_at)rows.push({key:'accepted',at:service.aceptado_at,title:'Pedido aceptado / asignado',detail:`Proveedor: ${name(service.proveedor)}`,role:'proveedor'})
  for(const e of legacyEvents)rows.push({key:`legacy-${e.id}`,at:e.created_at,title:e.estado_nuevo?stateLabel(e.estado_nuevo):e.evento.replaceAll('_',' '),detail:[e.estado_anterior?`Desde ${stateLabel(e.estado_anterior)}`:null,actors[e.actor_id||'']?`Actor: ${actors[e.actor_id||'']}`:null].filter(Boolean).join(' · ')||'Evento histórico registrado por UGO',role:'histórico'})
  for(const e of events)rows.push({key:`event-${e.id}`,at:e.created_at,title:stateLabel(e.estado_nuevo),detail:[e.estado_anterior?`Desde ${stateLabel(e.estado_anterior)}`:null,e.motivo?e.motivo:null,actors[e.actor_id||'']?`Actor: ${actors[e.actor_id||'']}`:null].filter(Boolean).join(' · ')||'Cambio registrado por UGO',role:e.actor_role})
  if(service.iniciado_at)rows.push({key:'started',at:service.iniciado_at,title:'Horario de inicio registrado',detail:'Inicio persistido del trabajo',role:'sistema'})
  if(service.completado_at)rows.push({key:'completed',at:service.completado_at,title:'Horario de cierre registrado',detail:'Servicio completado',role:'sistema'})
  if(service.cancelado_at)rows.push({key:'cancelled',at:service.cancelado_at,title:'Horario de cancelación',detail:'Servicio cancelado',role:'sistema'})
  return rows.sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime())
 },[actors,events,legacyEvents,service])

 const clientReview=reviews.find(r=>(r.autor_tipo||'cliente')==='cliente')
 const providerReview=reviews.find(r=>r.autor_tipo==='proveedor')
 return <section className="ugo-admin-service-trace">
  <div className="ugo-admin-service-trace-head"><div><small>TRAZABILIDAD COMPLETA</small><h3>Historial del servicio</h3><p>Cliente, proveedor, evidencia, horarios, pagos y reputación sobre el mismo serviceId.</p></div><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar historial'}</button></div>
  {error&&<div className="ugo-admin-service-trace-error">{error}</div>}
  <div className="ugo-admin-service-people"><div><small>CLIENTE</small><strong>{name(service.cliente)}</strong></div><div><small>PROVEEDOR</small><strong>{name(service.proveedor)}</strong></div><div><small>SERVICE ID</small><code>{service.id}</code></div></div>
  <div className="ugo-admin-service-grid">
   <section><header><strong>Cronología</strong><span>{timeline.length} eventos</span></header><div className="ugo-admin-service-timeline">{timeline.map(item=><article key={item.key}><i/><time>{when(item.at)}</time><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.role||'sistema'}</small></div></article>)}{!timeline.length&&<p className="empty">Sin eventos registrados.</p>}</div></section>
   <section><header><strong>Pago</strong><span>{payments.length}</span></header>{payments.map(p=><article className="ugo-admin-payment-card" key={p.id}><b>{money(p.monto_bruto,p.moneda)}</b><span>{p.metodo||p.modelo_pago||'método no registrado'} · {p.estado}</span><small>Creado {when(p.created_at)}</small>{p.autorizado_at&&<small>Autorizado {when(p.autorizado_at)}</small>}{p.fecha_confirmacion&&<small>Confirmado {when(p.fecha_confirmacion)}</small>}{p.liberado_at&&<small>{p.metodo==='efectivo'?'Efectivo confirmado':'Liberado a saldo UGO'} {when(p.liberado_at)}</small>}{p.metodo==='efectivo'&&<><small>Proveedor recibió: {money(p.monto_bruto,p.moneda)}</small><small>Comisión UGO: {money(p.comision_ugo,p.moneda)}</small><small>Neto proveedor: {money(p.ganancia_proveedor,p.moneda)}</small></>}{p.pix_informado_at&&<small>PIX informado {when(p.pix_informado_at)}</small>}{p.pix_conciliado_at&&<small>PIX conciliado {when(p.pix_conciliado_at)}</small>}{p.reembolsado_at&&<small>Reembolsado {when(p.reembolsado_at)}</small>}</article>)}{!payments.length&&<p className="empty">Sin pago registrado.</p>}{debts.map(d=><article className="ugo-admin-payment-card" key={d.id}><b>Deuda UGO · {money(d.saldo_pendiente,d.moneda)}</b><span>Comisión por efectivo · {d.estado}</span><small>Comisión original {money(d.comision_ugo,d.moneda)}</small><small>Pagado a UGO {money(d.monto_pagado_ugo,d.moneda)}</small>{d.referencia_pago&&<small>Referencia {d.referencia_pago}</small>}{d.pago_informado_at&&<small>Informado {when(d.pago_informado_at)}</small>}{d.pagado_at&&<small>Saldado {when(d.pagado_at)}</small>}</article>)}</section>
  </div>
  <AdminServiceExtendedTrace service={service}/>
  <section className="ugo-admin-evidence"><header><strong>Fotos y evidencias</strong><span>{evidence.length}</span></header><div className="ugo-admin-evidence-grid">{evidence.map(item=><figure key={item.id}>{item.url?<a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={item.kind==='solicitud'?'Foto enviada con el pedido':`Evidencia ${item.tipo}`}/></a>:<div className="ugo-admin-evidence-empty">Sin vista previa</div>}<figcaption><b>{item.kind==='solicitud'?'Foto del pedido':stateLabel(item.tipo)}</b><span>{item.kind==='solicitud'?'Cliente':item.usuario_id===service.proveedor_id?'Proveedor':item.usuario_id===service.cliente_id?'Cliente':'Participante'} · {when(item.created_at)}</span>{item.descripcion&&<small>{item.descripcion}</small>}</figcaption></figure>)}{!evidence.length&&<p className="empty">Este servicio no tiene fotos/evidencias guardadas.</p>}</div></section>
  <section className="ugo-admin-ratings"><header><strong>Calificaciones cruzadas</strong><span>{reviews.length}/2</span></header><div><article className={clientReview?'done':'pending'}><small>CLIENTE → PROVEEDOR</small><strong>{clientReview?`${'★'.repeat(clientReview.puntuacion)}${'☆'.repeat(5-clientReview.puntuacion)}`:'Pendiente'}</strong><p>{clientReview?.comentario||'El cliente todavía no calificó este servicio.'}</p>{clientReview&&<time>{when(clientReview.created_at)}</time>}</article><article className={providerReview?'done':'pending'}><small>PROVEEDOR → CLIENTE</small><strong>{providerReview?`${'★'.repeat(providerReview.puntuacion)}${'☆'.repeat(5-providerReview.puntuacion)}`:'Pendiente'}</strong><p>{providerReview?.comentario||'El proveedor todavía no calificó al cliente.'}</p>{providerReview&&<time>{when(providerReview.created_at)}</time>}</article></div></section>
 </section>
}
