import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import{money}from'./shared'
import'./service-expansion.css'

type Expansion={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;propuesto_por:string;propuesto_por_rol:'cliente'|'proveedor';descripcion:string;monto_extra:number;minutos_extra:number;estado:'pendiente'|'aprobada'|'rechazada'|'cancelada';pago_estado:'no_aplica'|'incluido'|'pendiente_ajuste';created_at:string;resuelto_at:string|null}
type ServiceLite={id:string;estado:string;tarifa:number|null;moneda:string;descripcion:string}
const ACTIVE=['asignado','en_camino','llegado','en_progreso']

export function ServiceExpansionPanel({role,serviceId,compact=false}:{role:UgoRole;serviceId?:string|null;compact?:boolean}){
 const sb=useMemo(()=>getRoleSupabase(role),[role])
 const[service,setService]=useState<ServiceLite|null>(null),[items,setItems]=useState<Expansion[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const[description,setDescription]=useState(''),[amount,setAmount]=useState(''),[minutes,setMinutes]=useState('30')
 const load=useCallback(async()=>{
  const{data:auth}=await sb.auth.getUser();const user=auth.user;if(!user)return
  let query=sb.from('servicios').select('id,estado,tarifa,moneda,descripcion')
  if(serviceId)query=query.eq('id',serviceId)
  else query=role==='client'?query.eq('cliente_id',user.id):query.eq('proveedor_id',user.id)
  const{data:s,error:se}=await query.in('estado',ACTIVE).order('created_at',{ascending:false}).limit(1).maybeSingle();if(se)throw se
  setService((s as ServiceLite|null)||null)
  if(!s){setItems([]);return}
  const{data:x,error:xe}=await sb.from('ampliaciones_servicio').select('*').eq('servicio_id',s.id).order('created_at',{ascending:false});if(xe)throw xe
  setItems((x||[])as Expansion[])
 },[role,sb,serviceId])
 useEffect(()=>{load().catch(()=>{})},[load])
 useEffect(()=>{if(!service?.id)return;const ch=sb.channel(`expansion-${role}-${service.id}`).on('postgres_changes',{event:'*',schema:'public',table:'ampliaciones_servicio',filter:`servicio_id=eq.${service.id}`},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`servicio_id=eq.${service.id}`},()=>load().catch(()=>{})).subscribe();return()=>{sb.removeChannel(ch)}},[load,role,sb,service?.id])
 if(!service)return null
 const pending=items.filter(x=>x.estado==='pendiente')
 async function propose(e:React.FormEvent){e.preventDefault();const extra=Number(amount||0),mins=Number(minutes||0);if(description.trim().length<4){setMessage('Describí el trabajo adicional.');return}if(!Number.isFinite(extra)||extra<0||!Number.isFinite(mins)||mins<0){setMessage('Revisá monto y tiempo adicional.');return}setBusy(true);setMessage('');const{error}=await sb.rpc('proponer_ampliacion_servicio',{p_servicio_id:service.id,p_descripcion:description.trim(),p_monto_extra:extra,p_minutos_extra:mins});setBusy(false);if(error){setMessage(error.message);return}setDescription('');setAmount('');setMinutes('30');setMessage(role==='client'?'Solicitud adicional registrada.':'Propuesta enviada al cliente para aprobación.');await load()}
 async function resolve(id:string,approve:boolean){setBusy(true);setMessage('');const{error}=await sb.rpc('resolver_ampliacion_servicio',{p_ampliacion_id:id,p_aprobar:approve});setBusy(false);if(error){setMessage(error.message);return}setMessage(approve?'Trabajo adicional aprobado.':'Trabajo adicional rechazado.');await load()}
 const body=<div className="ugo-expansion-body">
  {items.length>0&&<div className="ugo-expansion-list">{items.map(x=><article key={x.id} className={`ugo-expansion-item state-${x.estado}`}><div className="ugo-expansion-head"><b>{x.propuesto_por_rol==='cliente'?'Pedido del cliente':'Propuesta del proveedor'}</b><span>{x.estado}</span></div><p>{x.descripcion}</p><div className="ugo-expansion-meta"><strong>+ {money(x.monto_extra,service.moneda||'BRL')}</strong><span>+ {x.minutos_extra} min</span></div>{x.pago_estado==='pendiente_ajuste'&&<small>⚠ Aprobado. Falta ajustar el pago electrónico antes de considerar protegido el monto adicional.</small>}{x.pago_estado==='incluido'&&x.estado==='aprobada'&&<small>✓ Importe incorporado al total del servicio.</small>}{role==='client'&&x.estado==='pendiente'&&<div className="ugo-expansion-actions"><button disabled={busy} onClick={()=>resolve(x.id,false)}>Rechazar</button><button className="primary" disabled={busy} onClick={()=>resolve(x.id,true)}>Aprobar</button></div>}</article>)}</div>}
  <form className="ugo-expansion-form" onSubmit={propose}><label>Trabajo adicional<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={role==='client'?'Ej.: también necesito cambiar la llave del lavatorio':'Ej.: detecté que también conviene reemplazar la flexible'}/></label><div className="ugo-expansion-grid"><label>Monto extra<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label><label>Tiempo extra<input type="number" min="0" step="5" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div><button className="ugo-expansion-submit" disabled={busy}>{busy?'Procesando…':role==='client'?'Solicitar trabajo adicional':'Proponer al cliente'}</button></form>
  {message&&<div className="ugo-expansion-message">{message}</div>}
 </div>
 if(compact)return <section className="ugo-expansion-panel compact"><header><div><small>MEJORAS DE FLUJO</small><h3>Agregar trabajo</h3></div>{pending.length>0&&<b>{pending.length}</b>}</header>{body}</section>
 return <aside className={`ugo-expansion-dock ${open?'open':''}`}><button className="ugo-expansion-trigger" onClick={()=>setOpen(v=>!v)}>＋ Agregar trabajo{pending.length>0?` (${pending.length})`:''}</button>{open&&<section className="ugo-expansion-panel"><header><div><small>SERVICIO ACTIVO</small><h2>Ampliar servicio</h2></div><button className="close" onClick={()=>setOpen(false)}>×</button></header>{body}</section>}</aside>
}
