import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-reports-center.css'

type Period='today'|'7d'|'30d'|'month'|'custom'
type View='operations'|'finance'|'people'|'quality'
type ReportData={services:any[];payments:any[];withdrawals:any[];disputes:any[];reviews:any[];providers:any[]}
const empty:ReportData={services:[],payments:[],withdrawals:[],disputes:[],reviews:[],providers:[]}
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const pct=(n:number,d:number)=>d?`${((n/d)*100).toFixed(1)}%`:'0%'
const dateInput=(d:Date)=>d.toISOString().slice(0,10)
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0

function rangeFor(period:Period,from:string,to:string){
 const now=new Date();let start=new Date();let end=new Date(now)
 if(period==='today'){start.setHours(0,0,0,0)}
 if(period==='7d'){start=new Date(now.getTime()-6*86400000);start.setHours(0,0,0,0)}
 if(period==='30d'){start=new Date(now.getTime()-29*86400000);start.setHours(0,0,0,0)}
 if(period==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);start.setHours(0,0,0,0)}
 if(period==='custom'){start=from?new Date(`${from}T00:00:00`):new Date(now.getFullYear(),now.getMonth(),1);end=to?new Date(`${to}T23:59:59.999`):now}
 return{start,end}
}
function csvCell(v:any){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`}
function downloadCsv(name:string,rows:any[]){if(!rows.length)return;const keys:string[]=[];rows.forEach(r=>Object.keys(r||{}).forEach(k=>{if(!keys.includes(k))keys.push(k)}));const csv=[keys.map(csvCell).join(','),...rows.map(r=>keys.map(k=>csvCell(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}

export function AdminReportsCenter(){
 const[period,setPeriod]=useState<Period>('30d'),[view,setView]=useState<View>('operations')
 const[from,setFrom]=useState(dateInput(new Date(Date.now()-29*86400000))),[to,setTo]=useState(dateInput(new Date()))
 const[data,setData]=useState<ReportData>(empty),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[updated,setUpdated]=useState<Date|null>(null)
 const{start,end}=useMemo(()=>rangeFor(period,from,to),[period,from,to])
 const load=useCallback(async()=>{
  setLoading(true);setError(null);const db=supabase as any,s=start.toISOString(),e=end.toISOString()
  const results=await Promise.all([
   db.from('servicios').select('id,numero,estado,ambiente,tarifa,comision_ugo,ganancia_proveedor,categoria_id,proveedor_id,cliente_id,created_at,aceptado_at,iniciado_at,completado_at,cancelado_at,categoria:categorias!servicios_categoria_id_fkey(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,apellido)').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(2000),
   db.from('pagos').select('id,servicio_id,ambiente,monto_bruto,comision_ugo,ganancia_proveedor,estado,metodo,created_at,liberado_at,reembolsado_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(2000),
   db.from('retiros').select('id,pago_id,proveedor_id,ambiente,monto,estado,created_at,procesado_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(2000),
   db.from('disputas').select('id,servicio_id,estado,motivo,created_at,resuelta_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(2000),
   db.from('resenas').select('id,servicio_id,proveedor_id,puntuacion,created_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(2000),
   db.from('perfiles_proveedor').select('usuario_id,estado_verificacion,online,disponible,created_at').limit(2000)
  ])
  const firstError=results.find((r:any)=>r.error)?.error;if(firstError){setError(firstError.message||'No se pudieron cargar los reportes');setLoading(false);return}
  setData({services:results[0].data||[],payments:results[1].data||[],withdrawals:results[2].data||[],disputes:results[3].data||[],reviews:results[4].data||[],providers:results[5].data||[]});setUpdated(new Date());setLoading(false)
 },[start.getTime(),end.getTime()])
 useEffect(()=>{void load()},[load])

 const real=useMemo(()=>data.services.filter(s=>s.ambiente==='real'),[data.services])
 const demo=useMemo(()=>data.services.filter(s=>s.ambiente==='demo'),[data.services])
 const realIds=useMemo(()=>new Set(real.map(s=>s.id)),[real])
 const realPayments=useMemo(()=>data.payments.filter(p=>p.ambiente==='real'&&realIds.has(p.servicio_id)),[data.payments,realIds])
 const realWithdrawals=useMemo(()=>data.withdrawals.filter(w=>w.ambiente==='real'),[data.withdrawals])
 const realDisputes=useMemo(()=>data.disputes.filter(d=>realIds.has(d.servicio_id)),[data.disputes,realIds])
 const realReviews=useMemo(()=>data.reviews.filter(r=>realIds.has(r.servicio_id)),[data.reviews,realIds])
 const stats=useMemo(()=>{
  const matched=real.filter(s=>!!s.proveedor_id),completed=real.filter(s=>s.estado==='completado'),canceled=real.filter(s=>s.estado==='cancelado')
  const active=real.filter(s=>!['completado','cancelado'].includes(s.estado)),providerIds=new Set(matched.map(s=>s.proveedor_id).filter(Boolean)),activeProviderIds=new Set(active.map(s=>s.proveedor_id).filter(Boolean))
  const assignmentMinutes=matched.filter(s=>s.aceptado_at).map(s=>(new Date(s.aceptado_at).getTime()-new Date(s.created_at).getTime())/60000).filter((n:number)=>n>=0&&Number.isFinite(n))
  const validPayments=realPayments.filter(p=>p.estado!=='reembolsado'&&!p.reembolsado_at),gmv=validPayments.reduce((a,p)=>a+Number(p.monto_bruto||0),0),commission=validPayments.reduce((a,p)=>a+Number(p.comision_ugo||0),0),providerNet=validPayments.reduce((a,p)=>a+Number(p.ganancia_proveedor||0),0)
  const refunds=realPayments.filter(p=>p.estado==='reembolsado'||!!p.reembolsado_at).reduce((a,p)=>a+Number(p.monto_bruto||0),0),withdrawn=realWithdrawals.filter(w=>w.estado==='pagado').reduce((a,w)=>a+Number(w.monto||0),0),pendingWithdrawals=realWithdrawals.filter(w=>['pendiente','procesando'].includes(w.estado)).reduce((a,w)=>a+Number(w.monto||0),0)
  const verified=data.providers.filter(p=>p.estado_verificacion==='verificado').length,online=data.providers.filter(p=>p.online).length,available=data.providers.filter(p=>p.online&&p.disponible).length
  const rating=avg(realReviews.map(r=>Number(r.puntuacion||0))),openDisputes=realDisputes.filter(d=>!['resuelta','cerrada','rechazada'].includes(String(d.estado))).length
  return{total:real.length,matched:matched.length,matching:pct(matched.length,real.length),assignment:avg(assignmentMinutes),completed:completed.length,canceled:canceled.length,cancelRate:pct(canceled.length,real.length),completionRate:pct(completed.length,real.length),active:active.length,gmv,commission,providerNet,refunds,withdrawn,pendingWithdrawals,ticket:validPayments.length?gmv/validPayments.length:0,clients:new Set(real.map(s=>s.cliente_id).filter(Boolean)).size,providers:providerIds.size,activeProviders:activeProviderIds.size,verified,online,available,onlineToJob:pct(activeProviderIds.size,Math.max(online,1)),rating,disputes:realDisputes.length,openDisputes,demo:demo.length}
 },[real,demo,realPayments,realWithdrawals,realDisputes,realReviews,data.providers])
 const topCategories=useMemo(()=>Object.values(real.reduce((m:any,s:any)=>{const k=s.categoria_id||'sin';if(!m[k])m[k]={name:s.categoria?.nombre||'Sin categoría',emoji:s.categoria?.emoji||'•',count:0,completed:0,canceled:0};m[k].count++;if(s.estado==='completado')m[k].completed++;if(s.estado==='cancelado')m[k].canceled++;return m},{})).sort((a:any,b:any)=>b.count-a.count).slice(0,6) as any[],[real])
 const topProviders=useMemo(()=>Object.values(real.reduce((m:any,s:any)=>{if(!s.proveedor_id)return m;const k=s.proveedor_id;if(!m[k])m[k]={name:[s.proveedor?.nombre,s.proveedor?.apellido].filter(Boolean).join(' ')||'Proveedor',count:0,completed:0};m[k].count++;if(s.estado==='completado')m[k].completed++;return m},{})).sort((a:any,b:any)=>b.completed-a.completed||b.count-a.count).slice(0,6) as any[],[real])
 const exportCurrent=()=>downloadCsv(`ugo-${view}-REAL-${dateInput(start)}-${dateInput(end)}.csv`,view==='operations'?real:view==='finance'?[...realPayments,...realWithdrawals]:view==='quality'?[...realDisputes,...realReviews]:data.providers)
 if(error)return <div className="ugo-reports-state error"><strong>No se pudieron cargar los reportes</strong><span>{error}</span><button onClick={()=>void load()}>Reintentar</button></div>
 return <div className="ugo-reports">
  <section className="ugo-reports-hero"><div><small>CENTRO DE MÉTRICAS · REAL</small><h3>Rendimiento comercial de UGO</h3><p>DEMO queda separado y nunca entra en GMV, comisión, conversión ni calidad.</p></div><div><button onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button><button className="primary" onClick={exportCurrent} disabled={loading}>Exportar CSV REAL</button></div></section>
  <section className="ugo-reports-period"><div className="ugo-reports-pills">{([['today','Hoy'],['7d','7 días'],['30d','30 días'],['month','Mes'],['custom','Personalizado']] as [Period,string][]).map(([k,l])=><button key={k} className={period===k?'active':''} onClick={()=>setPeriod(k)}>{l}</button>)}</div>{period==='custom'&&<div className="ugo-reports-dates"><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}<span>{start.toLocaleDateString('es-AR')} → {end.toLocaleDateString('es-AR')}{updated?` · ${updated.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:''}</span></section>
  <section className="ugo-reports-kpis executive"><article><small>PEDIDOS REAL</small><strong>{stats.total}</strong><span>{stats.demo} DEMO excluidos</span></article><article><small>MATCHING</small><strong>{stats.matching}</strong><span>{stats.matched} asignados</span></article><article><small>ASIGNACIÓN PROM.</small><strong>{stats.assignment?`${stats.assignment.toFixed(1)} min`:'—'}</strong><span>pedido → aceptación</span></article><article><small>COMPLETADOS</small><strong>{stats.completed}</strong><span>{stats.completionRate} finalización</span></article><article><small>GMV REAL</small><strong>{money(stats.gmv)}</strong><span>Ticket {money(stats.ticket)}</span></article><article><small>COMISIÓN UGO</small><strong>{money(stats.commission)}</strong><span>Registrada, no estimada</span></article><article><small>PROV. ACTIVOS</small><strong>{stats.providers}</strong><span>{stats.online} online ahora</span></article><article><small>RATING</small><strong>{stats.rating?stats.rating.toFixed(2):'—'}</strong><span>{realReviews.length} reseñas reales</span></article><article><small>DISPUTAS</small><strong>{stats.disputes}</strong><span>{stats.openDisputes} abiertas</span></article><article><small>CANCELACIÓN</small><strong>{stats.cancelRate}</strong><span>{stats.canceled} cancelados</span></article></section>
  <div className="ugo-reports-note">Separación activa: <b>REAL {stats.total}</b> · <b>DEMO {stats.demo}</b>. Las pruebas siguen visibles para auditoría, pero no contaminan negocio.</div>
  <nav className="ugo-reports-tabs">{([['operations','Operación'],['finance','Finanzas'],['people','Proveedores'],['quality','Calidad']] as [View,string][]).map(([k,l])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</nav>
  {loading?<div className="ugo-reports-state">Cargando métricas reales…</div>:<>
   {view==='operations'&&<div className="ugo-reports-grid"><section><header><div><small>FUNNEL</small><h4>Pedido → cierre</h4></div></header><div className="ugo-reports-metrics"><div><span>Pedidos</span><b>{stats.total}</b></div><div><span>Matching</span><b>{stats.matching}</b></div><div><span>Completados</span><b>{stats.completed}</b></div><div><span>Cancelados</span><b>{stats.canceled}</b></div></div></section><section><header><div><small>CATEGORÍAS</small><h4>Más solicitadas</h4></div></header><div className="ugo-reports-ranking">{topCategories.map((x:any,i)=><div key={i}><span>{x.emoji} {x.name}</span><b>{x.count}</b><small>{x.completed} completados · {x.canceled} cancelados</small></div>)}{!topCategories.length&&<p>Sin servicios reales.</p>}</div></section><section><header><div><small>PROVEEDORES</small><h4>Mejor actividad</h4></div></header><div className="ugo-reports-ranking providers">{topProviders.map((x:any,i)=><div key={i}><span>{x.name}</span><b>{x.completed}</b><small>{x.count} asignados</small></div>)}</div></section></div>}
   {view==='finance'&&<div className="ugo-reports-grid"><section><header><div><small>FINANZAS REAL</small><h4>Resultado del período</h4></div></header><div className="ugo-reports-metrics"><div><span>GMV</span><b>{money(stats.gmv)}</b></div><div><span>Comisión UGO</span><b>{money(stats.commission)}</b></div><div><span>Neto proveedores</span><b>{money(stats.providerNet)}</b></div><div><span>Ticket medio</span><b>{money(stats.ticket)}</b></div></div></section><section><header><div><small>TESORERÍA</small><h4>Salidas y ajustes</h4></div></header><div className="ugo-reports-metrics"><div><span>Retirado</span><b>{money(stats.withdrawn)}</b></div><div><span>Retiros pendientes</span><b>{money(stats.pendingWithdrawals)}</b></div><div><span>Reembolsado</span><b>{money(stats.refunds)}</b></div><div><span>Pagos reales</span><b>{realPayments.length}</b></div></div></section></div>}
   {view==='people'&&<div className="ugo-reports-grid"><section><header><div><small>OFERTA</small><h4>Proveedores</h4></div></header><div className="ugo-reports-metrics"><div><span>Verificados</span><b>{stats.verified}</b></div><div><span>Online</span><b>{stats.online}</b></div><div><span>Disponibles</span><b>{stats.available}</b></div><div><span>Con trabajo en período</span><b>{stats.providers}</b></div><div><span>Online → trabajo ahora</span><b>{stats.onlineToJob}</b></div><div><span>Clientes reales</span><b>{stats.clients}</b></div></div></section></div>}
   {view==='quality'&&<div className="ugo-reports-grid"><section><header><div><small>CALIDAD</small><h4>Experiencia real</h4></div></header><div className="ugo-reports-metrics"><div><span>Rating promedio</span><b>{stats.rating?stats.rating.toFixed(2):'—'}</b></div><div><span>Reseñas</span><b>{realReviews.length}</b></div><div><span>Disputas</span><b>{stats.disputes}</b></div><div><span>Disputas abiertas</span><b>{stats.openDisputes}</b></div><div><span>Cancelación</span><b>{stats.cancelRate}</b></div><div><span>Tiempo asignación</span><b>{stats.assignment?`${stats.assignment.toFixed(1)} min`:'—'}</b></div></div></section></div>}
  </>}
 </div>
}
