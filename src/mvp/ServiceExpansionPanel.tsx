import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import{money}from'./shared'
import'./service-expansion.css'

type Expansion={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;propuesto_por:string;propuesto_por_rol:'cliente'|'proveedor';descripcion:string;monto_extra:number;minutos_extra:number;estado:'pendiente'|'aprobada'|'rechazada'|'cancelada';pago_estado:'no_aplica'|'incluido'|'pendiente_ajuste';ajuste_estado:'no_iniciado'|'pendiente'|'retenido'|'fallido'|'reembolsado';ajuste_init_point:string|null;created_at:string;resuelto_at:string|null}
type ServiceLite={id:string;estado:string;tarifa:number|null;moneda:string;descripcion:string}
type PaymentLite={metodo:string|null;procesador:string|null;modelo_pago:string|null;estado:string}
type AdjustmentResponse={success?:boolean;initPoint?:string;error?:string}
type ExpansionKind='trabajo'|'materiales'
const ACTIVE=['asignado','en_camino','llegado','en_progreso']
const RETRYABLE_PAYMENT_STATES=new Set(['fallido','reembolsado'])
const MATERIAL_PREFIX='Materiales · '

export function ServiceExpansionPanel({role,serviceId,compact=false}:{role:UgoRole;serviceId?:string|null;compact?:boolean}){
 const sb=useMemo(()=>getRoleSupabase(role),[role])
 const[service,setService]=useState<ServiceLite|null>(null),[payment,setPayment]=useState<PaymentLite|null>(null),[items,setItems]=useState<Expansion[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const[description,setDescription]=useState(''),[amount,setAmount]=useState(''),[minutes,setMinutes]=useState('30'),[kind,setKind]=useState<ExpansionKind>('trabajo')
 const load=useCallback(async()=>{
  const{data:auth}=await sb.auth.getUser();const user=auth.user;if(!user)return
  let query=sb.from('servicios').select('id,estado,tarifa,moneda,descripcion')
  if(serviceId)query=query.eq('id',serviceId)
  else query=role==='client'?query.eq('cliente_id',user.id):query.eq('proveedor_id',user.id)
  const{data:s,error:se}=await query.in('estado',ACTIVE).order('created_at',{ascending:false}).limit(1).maybeSingle();if(se)throw se
  const current=(s as ServiceLite|null)||null;setService(current)
  if(!current){setItems([]);setPayment(null);return}
  const[{data:x,error:xe},{data:p,error:pe}]=await Promise.all([
   sb.from('ampliaciones_servicio').select('*').eq('servicio_id',current.id).order('created_at',{ascending:false}),
   sb.from('pagos').select('metodo,procesador,modelo_pago,estado').eq('servicio_id',current.id).maybeSingle(),
  ]);if(xe)throw xe;if(pe)throw pe
  setItems((x||[])as Expansion[]);setPayment((p||null)as PaymentLite|null)
 },[role,sb,serviceId])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!service?.id)return;const ch=sb.channel(`expansion-${role}-${service.id}`).on('postgres_changes',{event:'*',schema:'public',table:'ampliaciones_servicio',filter:`servicio_id=eq.${service.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`servicio_id=eq.${service.id}`},()=>void load()).subscribe();return()=>{sb.removeChannel(ch)}},[load,role,sb,service?.id])
 if(!service)return null
 const pending=items.filter(x=>x.estado==='pendiente')
 const canonicalCash=payment?.metodo==='efectivo'&&payment?.procesador==='efectivo'&&payment?.modelo_pago==='presencial'
 const activeElectronic=Boolean(payment&&!canonicalCash&&!RETRYABLE_PAYMENT_STATES.has(payment.estado))
 const needsElectronicAdjustment=(item:Expansion)=>item.estado==='pendiente'&&Number(item.monto_extra)>0&&activeElectronic
 async function propose(e:React.FormEvent){e.preventDefault();const extra=Number(amount||0),mins=Number(minutes||0);if(description.trim().length<4){setMessage(kind==='materiales'?'Describí los materiales necesarios.':'Describí el trabajo adicional.');return}if(!Number.isFinite(extra)||extra<0||!Number.isFinite(mins)||mins<0){setMessage('Revisá monto y tiempo adicional.');return}const detail=kind==='materiales'?`${MATERIAL_PREFIX}${description.trim()}`:description.trim();setBusy(true);setMessage('');const{error}=await sb.rpc('proponer_ampliacion_servicio',{p_servicio_id:service.id,p_descripcion:detail,p_monto_extra:extra,p_minutos_extra:mins});setBusy(false);if(error){setMessage(error.message);return}setDescription('');setAmount('');setMinutes('30');setKind('trabajo');setMessage(role==='client'?'Solicitud adicional registrada.':'Propuesta enviada al cliente para aprobación.');await load()}
 async function startElectronicAdjustment(item:Expansion){
  setBusy(true);setMessage('')
  const{data:sessionData}=await sb.auth.getSession();const token=sessionData.session?.access_token
  if(!token){setBusy(false);setMessage('Tu sesión venció. Volvé a ingresar para pagar el trabajo adicional.');return}
  try{
   const response=await fetch('/api/pagos/ajuste-ampliacion',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({ampliacionId:item.id})})
   const data=(await response.json().catch(()=>({})))as AdjustmentResponse
   if(!response.ok||!data.initPoint){setMessage(data.error||'No se pudo iniciar el pago adicional.');return}
   window.location.assign(data.initPoint)
  }catch{setMessage('No se pudo conectar con el checkout del trabajo adicional.')}
  finally{setBusy(false)}
 }
 async function resolve(id:string,approve:boolean){const item=items.find(x=>x.id===id);if(approve&&item&&needsElectronicAdjustment(item)){await startElectronicAdjustment(item);return}setBusy(true);setMessage('');const{error}=await sb.rpc('resolver_ampliacion_servicio',{p_ampliacion_id:id,p_aprobar:approve});setBusy(false);if(error){setMessage(error.message);return}setMessage(approve?'Cambio aprobado.':'Cambio rechazado.');await load()}
 const body=<div className="ugo-expansion-body">
  {items.length>0&&<div className="ugo-expansion-list">{items.map(x=>{const adjustmentRequired=needsElectronicAdjustment(x),adjustmentPending=adjustmentRequired&&x.ajuste_estado==='pendiente',isMaterials=x.descripcion.startsWith(MATERIAL_PREFIX),detail=isMaterials?x.descripcion.slice(MATERIAL_PREFIX.length):x.descripcion;return <article key={x.id} className={`ugo-expansion-item state-${x.estado}`}><div className="ugo-expansion-head"><b>{isMaterials?'Materiales':x.propuesto_por_rol==='cliente'?'Pedido del cliente':'Propuesta del proveedor'}</b><span>{x.estado}</span></div><p>{detail}</p><div className="ugo-expansion-meta"><strong>+ {money(x.monto_extra,service.moneda||'BRL')}</strong><span>+ {x.minutos_extra} min</span></div>{isMaterials&&<small>El cliente debe aprobar materiales y costo antes de incorporarlos al servicio.</small>}{adjustmentRequired&&<small>⚠ El monto adicional se cobra por separado antes de aprobar el nuevo alcance. El pago base del servicio no se modifica.</small>}{adjustmentPending&&<small>Checkout adicional pendiente. Podés continuarlo sin crear otra ampliación.</small>}{x.ajuste_estado==='fallido'&&x.estado==='pendiente'&&<small>El intento de pago adicional falló. Podés reintentarlo.</small>}{x.ajuste_estado==='reembolsado'&&<small>⚠ El ajuste fue reembolsado y requiere conciliación antes del cierre.</small>}{x.pago_estado==='pendiente_ajuste'&&x.estado==='aprobada'&&<small>⚠ Existe un ajuste financiero pendiente. UGO no permite cerrar el servicio hasta reconciliarlo.</small>}{x.pago_estado==='incluido'&&x.estado==='aprobada'&&<small>✓ Importe adicional financiado e incorporado al total del servicio.</small>}{role==='client'&&x.estado==='pendiente'&&<div className="ugo-expansion-actions"><button disabled={busy} onClick={()=>resolve(x.id,false)}>Rechazar</button><button className="primary" disabled={busy} onClick={()=>resolve(x.id,true)}>{adjustmentRequired?(adjustmentPending?'Continuar pago':'Pagar y aprobar'):'Aprobar'}</button></div>}</article>})}</div>}
  <form className="ugo-expansion-form" onSubmit={propose}><div><small>¿QUÉ CAMBIÓ?</small><div className="ugo-expansion-actions"><button type="button" className={kind==='trabajo'?'primary':''} onClick={()=>setKind('trabajo')}>Trabajo adicional</button><button type="button" className={kind==='materiales'?'primary':''} onClick={()=>setKind('materiales')}>Materiales</button></div></div><label>{kind==='materiales'?'Materiales necesarios':'Trabajo adicional'}<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={kind==='materiales'?'Ej.: flexible 40 cm + válvula 1/2, compra necesaria para terminar':role==='client'?'Ej.: también necesito cambiar la llave del lavatorio':'Ej.: detecté que también conviene reemplazar la flexible'}/></label><div className="ugo-expansion-grid"><label>{kind==='materiales'?'Costo de materiales':'Monto extra'}<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label><label>Tiempo extra<input type="number" min="0" step="5" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div>{kind==='materiales'&&<small>No compres ni incorpores materiales cobrables sin aprobación del cliente dentro de UGO.</small>}<button className="ugo-expansion-submit" disabled={busy}>{busy?'Procesando…':role==='client'?'Solicitar cambio':kind==='materiales'?'Pedir aprobación de materiales':'Proponer al cliente'}</button></form>
  {message&&<div className="ugo-expansion-message">{message}</div>}
 </div>
 if(compact)return <section className="ugo-expansion-panel compact"><header><div><small>CAMBIOS APROBABLES</small><h3>Trabajo o materiales</h3></div>{pending.length>0&&<b>{pending.length}</b>}</header>{body}</section>
 return <aside className={`ugo-expansion-dock ${open?'open':''}`}><button className="ugo-expansion-trigger" onClick={()=>setOpen(v=>!v)}>＋ Cambios / materiales{pending.length>0?` (${pending.length})`:''}</button>{open&&<section className="ugo-expansion-panel"><header><div><small>SERVICIO ACTIVO</small><h2>Trabajo o materiales</h2></div><button className="close" onClick={()=>setOpen(false)}>×</button></header>{body}</section>}</aside>
}
