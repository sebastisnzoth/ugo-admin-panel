import React,{useMemo,useState}from'react'
import{useSystemAlerts,useOpenDisputes}from'../hooks/useAdminData'
import'./admin-decision-center.css'

const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'
const severity=(s:any)=>String(s||'info').toLowerCase()

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
 const{disputes,loading,resolverDisputa}=useOpenDisputes()
 const[selected,setSelected]=useState<any>(null),[text,setText]=useState(''),[favor,setFavor]=useState<'cliente'|'proveedor'>('cliente'),[busy,setBusy]=useState(false)
 const total=useMemo(()=>disputes.reduce((n:any,d:any)=>n+Number(d.monto_disputado||0),0),[disputes])
 const resolve=async()=>{if(!selected||!text.trim())return;setBusy(true);await resolverDisputa(selected.id,text.trim(),favor);setBusy(false);setSelected(null);setText('')}
 return <div className="ugo-decision">
  <div className="ugo-decision-summary"><article><small>CASOS ABIERTOS</small><strong>{disputes.length}</strong><span>En revisión</span></article><article><small>MONTO EN DISPUTA</small><strong className="money">{money(total)}</strong><span>Capital comprometido</span></article><article><small>PRIORIDAD</small><strong>{disputes.length?'ALTA':'OK'}</strong><span>{disputes.length?'Resolver pendientes':'Sin casos abiertos'}</span></article></div>
  {loading?<div className="ugo-decision-empty">Cargando disputas…</div>:<div className="ugo-dispute-grid">{disputes.map((d:any)=><article key={d.id} className="ugo-dispute-card"><header><div><span>{d.estado||'abierta'}</span><h3>Caso {d.numero||String(d.id).slice(0,8)}</h3></div><strong>{money(d.monto_disputado)}</strong></header><p>{d.motivo||'Sin motivo detallado.'}</p><dl><div><dt>Cliente</dt><dd>{d.clientes?.nombre||'Cliente'}</dd></div><div><dt>Proveedor</dt><dd>{d.proveedores?.nombre||'Proveedor'}</dd></div><div><dt>Creada</dt><dd>{when(d.created_at)}</dd></div></dl><button className="primary" onClick={()=>{setSelected(d);setText('');setFavor('cliente')}}>Revisar y resolver</button></article>)}{!disputes.length&&<div className="ugo-decision-empty">✓ No hay disputas abiertas.</div>}</div>}
  {selected&&<div className="ugo-resolution"><div><small>RESOLUCIÓN ADMINISTRATIVA</small><h3>Caso {selected.numero||String(selected.id).slice(0,8)}</h3><p>Registrá una resolución clara y verificable. La acción actualizará también el escrow del servicio.</p></div><div className="ugo-resolution-choice"><button className={favor==='cliente'?'active':''} onClick={()=>setFavor('cliente')}>A favor del cliente</button><button className={favor==='proveedor'?'active':''} onClick={()=>setFavor('proveedor')}>A favor del proveedor</button></div><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Explicá la decisión, evidencia revisada y motivo..."/><div className="ugo-resolution-actions"><button onClick={()=>setSelected(null)}>Cancelar</button><button className="primary" disabled={!text.trim()||busy} onClick={resolve}>{busy?'Resolviendo…':'Confirmar resolución'}</button></div></div>}
 </div>
}
