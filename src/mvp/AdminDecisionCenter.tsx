import React,{useEffect,useMemo,useState}from'react'
import{useSystemAlerts}from'../hooks/useAdminData'
import{useAdminDisputes}from'../hooks/useDisputes'
import{supabase}from'../lib/supabase'
import'./admin-decision-center.css'

const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'
const severity=(s:any)=>String(s||'info').toLowerCase()
const stateLabel=(s:any)=>String(s||'—').replaceAll('_',' ')

export function AdminAlertsDecisionCenter(){
 const{alerts,criticalCount,warningCount,refetch}=useSystemAlerts()
 const[filter,setFilter]=useState<'all'|'critical'|'warning'|'info'>('all')
 const visible=useMemo(()=>alerts.filter((a:any)=>filter==='all'||severity(a.severidad)===filter),[alerts,filter])
 const recommended=(a:any)=>{
  const t=String(a.tipo||a.titulo||'').toLowerCase()
  if(t.includes('pago')||t.includes('pix'))return 'Revisar conciliación y estado del pago antes de continuar.'
  if(t.includes('proveedor')||t.includes('document'))return 'Validar proveedor/documentación y resolver la restricción.'
  if(t.includes('disputa'))return 'Abrir el caso, revisar evidencia y definir resolución.'
  if(t.includes('servicio'))return 'Revisar el servicio y confirmar qué etapa quedó bloqueada.'
  return 'Revisar el contexto y resolver la causa antes de cerrar la alerta.'
 }
 return <div className="ugo-decision">
  <div className="ugo-decision-summary"><article><small>CRÍTICAS</small><strong>{criticalCount}</strong><span>Intervención inmediata</span></article><article><small>ADVERTENCIAS</small><strong>{warningCount}</strong><span>Revisar operación</span></article><article><small>TOTAL</small><strong>{alerts.length}</strong><span>Alertas activas</span></article><button onClick={refetch}>↻ Actualizar</button></div>
  <div className="ugo-decision-toolbar"><div>{(['all','critical','warning','info'] as const).map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x==='all'?'Todas':x==='critical'?'Críticas':x==='warning'?'Advertencias':'Informativas'}</button>)}</div></div>
  <div className="ugo-decision-list">{visible.map((a:any,i)=><article key={a.id||i} className={`ugo-alert-card ${severity(a.severidad)}`}><header><div><span>{severity(a.severidad)==='critical'?'Crítica':severity(a.severidad)==='warning'?'Advertencia':'Información'}</span><h3>{a.titulo||a.tipo||'Alerta operativa'}</h3></div><small>{when(a.created_at)}</small></header><p>{a.descripcion||a.mensaje||'La operación requiere revisión administrativa.'}</p><div className="ugo-alert-action"><b>Acción recomendada</b><span>{recommended(a)}</span></div></article>)}{!visible.length&&<div className="ugo-decision-empty">✓ No hay alertas en este filtro.</div>}</div>
 </div>
}

export function AdminDisputesDecisionCenter(){
 const{disputes,loading,error,resolverDisputa}=useAdminDisputes()
 const[selected,setSelected]=useState<any>(null),[text,setText]=useState(''),[favor,setFavor]=useState<'cliente'|'proveedor'>('cliente'),[busy,setBusy]=useState(false),[notice,setNotice]=useState<string|null>(null)
 const[messages,setMessages]=useState<any[]>([]),[evidence,setEvidence]=useState<any[]>([]),[serviceInfo,setServiceInfo]=useState<any>(null),[paymentInfo,setPaymentInfo]=useState<any>(null),[events,setEvents]=useState<any[]>([]),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState<string|null>(null)
 const total=useMemo(()=>disputes.reduce((n:any,d:any)=>n+Number(d.monto_disputado||0),0),[disputes])

 useEffect(()=>{if(!selected){setMessages([]);setEvidence([]);setServiceInfo(null);setPaymentInfo(null);setEvents([]);setDetailError(null);return}
  let alive=true;setDetailLoading(true);setDetailError(null)
  Promise.all([
   (supabase as any).from('disputa_mensajes').select('id,autor_id,autor_rol,mensaje,evidencias,created_at').eq('disputa_id',selected.id).order('created_at',{ascending:true}),
   (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,usuario_id,created_at').eq('servicio_id',selected.servicio_id).order('created_at',{ascending:true}),
   (supabase as any).from('servicios').select('id,numero,estado,tarifa,descripcion,direccion_cliente,created_at,aceptado_at,iniciado_at,completado_at,cancelado_at').eq('id',selected.servicio_id).maybeSingle(),
   (supabase as any).from('pagos').select('id,estado,monto_bruto,comision_ugo,ganancia_proveedor,metodo,procesador,mp_status,autorizado_at,liberado_at,reembolsado_at,created_at').eq('servicio_id',selected.servicio_id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
   (supabase as any).from('eventos_servicio').select('id,evento,estado_anterior,estado_nuevo,created_at').eq('servicio_id',selected.servicio_id).order('created_at',{ascending:false}).limit(12)
  ]).then(async([m,e,s,p,ev]:any[])=>{
   if(!alive)return
   const firstError=[m,e,s,p,ev].find((x:any)=>x?.error)?.error
   if(firstError)setDetailError(firstError.message||'No se pudo cargar todo el contexto del caso.')
   setMessages(m.data||[]);setServiceInfo(s.data||null);setPaymentInfo(p.data||null);setEvents(ev.data||[])
   const rows=e.data||[]
   const signed=await Promise.all(rows.map(async(row:any)=>{const{data}=await(supabase as any).storage.from('service-evidence').createSignedUrl(row.storage_path,900);return{...row,url:data?.signedUrl||null}}))
   if(alive){setEvidence(signed);setDetailLoading(false)}
  }).catch((x:any)=>{if(alive){setDetailError(x?.message||'No se pudo cargar el caso.');setDetailLoading(false)}})
  return()=>{alive=false}
 },[selected?.id])

 const impact=favor==='cliente'
  ?{title:'Impacto: resolución a favor del cliente',tone:'client',items:['El servicio disputado se cancela en UGO.','El pago queda sujeto al ajuste financiero correspondiente.','Si hubo cobro externo, el reembolso real debe procesarse y conciliarse en Mercado Pago.','La decisión queda auditada y visible para Cliente y Proveedor.']}
  :{title:'Impacto: resolución a favor del proveedor',tone:'provider',items:['El servicio vuelve al estado operativo previo a la disputa.','Si el pago estaba disputado, vuelve a estado retenido para continuar el flujo de liberación.','La decisión queda auditada y visible para Cliente y Proveedor.']}

 const resolve=async()=>{if(!selected||text.trim().length<8)return
  const ok=window.confirm(`Vas a resolver el caso #${selected.numero||String(selected.id).slice(0,8)} a favor del ${favor}. Esta acción queda registrada en UGO. ¿Confirmar?`)
  if(!ok)return
  setBusy(true);setNotice(null)
  try{await resolverDisputa(selected.id,text.trim(),favor);setSelected(null);setText('');setNotice('Disputa resuelta y visible para ambas partes.')}
  catch(e){setNotice(e instanceof Error?e.message:'No se pudo resolver la disputa.')}
  finally{setBusy(false)}
 }

 return <div className="ugo-decision">
  <div className="ugo-decision-summary"><article><small>CASOS ABIERTOS</small><strong>{disputes.length}</strong><span>Cliente y proveedor conectados</span></article><article><small>MONTO EN DISPUTA</small><strong className="money">{money(total)}</strong><span>Capital bajo revisión</span></article><article><small>PRIORIDAD</small><strong>{disputes.length?'ALTA':'OK'}</strong><span>{disputes.length?'Resolver pendientes':'Sin casos abiertos'}</span></article></div>
  {error&&<div className="ugo-decision-empty">Error: {error}</div>}{notice&&<div className="ugo-decision-empty">{notice}</div>}
  {loading?<div className="ugo-decision-empty">Cargando disputas…</div>:<div className="ugo-dispute-grid">{disputes.map((d:any)=><article key={d.id} className="ugo-dispute-card"><header><div><span>{stateLabel(d.estado)}</span><h3>Caso #{d.numero||String(d.id).slice(0,8)}</h3></div><strong>{money(d.monto_disputado)}</strong></header><p>{d.motivo||'Sin motivo detallado.'}</p><dl><div><dt>Cliente</dt><dd>{d.clientes?.nombre||'Cliente'}</dd></div><div><dt>Proveedor</dt><dd>{d.proveedores?.nombre||'Proveedor'}</dd></div><div><dt>Servicio</dt><dd>{String(d.servicio_id).slice(0,8)}</dd></div><div><dt>Creada</dt><dd>{when(d.created_at)}</dd></div></dl><button className="primary" onClick={()=>{setSelected(d);setText('');setFavor('cliente')}}>Revisar y resolver</button></article>)}{!disputes.length&&<div className="ugo-decision-empty">✓ No hay disputas abiertas.</div>}</div>}

  {selected&&<div className="ugo-resolution">
   <div className="ugo-resolution-head"><div><small>RESOLUCIÓN ADMINISTRATIVA</small><h3>Caso #{selected.numero||String(selected.id).slice(0,8)}</h3><p>Revisá contexto, pago, historial y evidencias antes de decidir.</p></div><button onClick={()=>setSelected(null)}>×</button></div>
   {detailError&&<div className="ugo-case-warning">No se pudo cargar una parte del contexto: {detailError}</div>}
   <div className="ugo-case-kpis"><article><small>SERVICIO</small><strong>#{serviceInfo?.numero||'—'}</strong><span>{stateLabel(serviceInfo?.estado)}</span></article><article><small>PAGO</small><strong>{stateLabel(paymentInfo?.estado)}</strong><span>{paymentInfo?money(paymentInfo.monto_bruto):'Sin pago'}</span></article><article><small>COMISIÓN UGO</small><strong>{paymentInfo?money(paymentInfo.comision_ugo):'—'}</strong><span>{paymentInfo?.metodo||'Sin método'}</span></article><article><small>MONTO DISPUTADO</small><strong>{money(selected.monto_disputado)}</strong><span>{when(selected.created_at)}</span></article></div>

   <div className="ugo-case-service"><div><small>SERVICIO</small><h4>{serviceInfo?.descripcion||selected.motivo||'Servicio en disputa'}</h4><p>{serviceInfo?.direccion_cliente||'Sin dirección registrada.'}</p></div><dl><div><dt>Creado</dt><dd>{when(serviceInfo?.created_at)}</dd></div><div><dt>Aceptado</dt><dd>{when(serviceInfo?.aceptado_at)}</dd></div><div><dt>Iniciado</dt><dd>{when(serviceInfo?.iniciado_at)}</dd></div><div><dt>Tarifa</dt><dd>{money(serviceInfo?.tarifa)}</dd></div></dl></div>

   <div className="ugo-case-context">
    <section><small>HILO DEL CASO</small>{detailLoading?<p>Cargando…</p>:messages.length?messages.map((m:any)=><article key={m.id}><div><b>{m.autor_rol==='admin'?'UGO Admin':m.autor_rol==='cliente'?'Cliente':'Proveedor'}</b><span>{when(m.created_at)}</span></div><p>{m.mensaje}</p>{Array.isArray(m.evidencias)&&m.evidencias.length>0&&<em>{m.evidencias.length} evidencia(s) adjunta(s)</em>}</article>):<p>Sin respuestas adicionales todavía.</p>}</section>
    <section><small>HISTORIAL DEL SERVICIO</small>{detailLoading?<p>Cargando…</p>:events.length?events.map((ev:any)=><article key={ev.id}><div><b>{ev.evento||'Cambio de estado'}</b><span>{when(ev.created_at)}</span></div><p>{stateLabel(ev.estado_anterior)} → {stateLabel(ev.estado_nuevo)}</p></article>):<p>No hay eventos registrados para este servicio.</p>}</section>
   </div>

   <section className="ugo-case-evidence"><div className="ugo-case-section-title"><small>EVIDENCIAS DEL SERVICIO</small><span>{evidence.length} archivo(s)</span></div>{detailLoading?<p>Cargando evidencias…</p>:evidence.length?<div className="ugo-evidence-grid">{evidence.map((e:any)=><figure key={e.id}>{e.url?<button type="button" className="ugo-evidence-image" onClick={()=>window.open(e.url,'_blank','noopener,noreferrer')}><img src={e.url} alt={`Evidencia ${e.tipo||''}`}/></button>:<div className="ugo-evidence-placeholder">Sin vista previa</div>}<figcaption><div><b>{String(e.tipo||'evidencia').toUpperCase()}</b><span>{when(e.created_at)}</span></div><p>{e.descripcion||'Sin descripción.'}</p>{e.url&&<button type="button" onClick={()=>window.open(e.url,'_blank','noopener,noreferrer')}>Ver evidencia</button>}</figcaption></figure>)}</div>:<p>No hay fotos o documentos registrados para este servicio.</p>}</section>

   <div className="ugo-resolution-choice"><button className={favor==='cliente'?'active client':''} onClick={()=>setFavor('cliente')}>A favor del cliente</button><button className={favor==='proveedor'?'active provider':''} onClick={()=>setFavor('proveedor')}>A favor del proveedor</button></div>
   <div className={`ugo-impact ${impact.tone}`}><strong>{impact.title}</strong>{impact.items.map((x,i)=><span key={i}>• {x}</span>)}</div>
   <label className="ugo-resolution-label">Fundamento de la resolución<textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Explicá qué evidencia revisaste, qué ocurrió y por qué UGO toma esta decisión..."/></label>
   <div className="ugo-resolution-actions"><button onClick={()=>setSelected(null)}>Cancelar</button><button className="primary" disabled={text.trim().length<8||busy} onClick={resolve}>{busy?'Resolviendo…':'Confirmar resolución'}</button></div>
  </div>}
 </div>
}
