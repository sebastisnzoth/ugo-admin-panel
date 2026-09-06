import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-reports-center.css'

type Period='today'|'7d'|'30d'|'month'|'custom'
type View='operations'|'finance'|'people'|'quality'
type ReportData={services:any[];payments:any[];users:any[];disputes:any[];reviews:any[];providers:any[]}
const empty:ReportData={services:[],payments:[],users:[],disputes:[],reviews:[],providers:[]}
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const pct=(n:number,d:number)=>d?`${((n/d)*100).toFixed(1)}%`:'0%'
const dateInput=(d:Date)=>d.toISOString().slice(0,10)

function rangeFor(period:Period,from:string,to:string){
 const now=new Date();let start=new Date();let end=new Date(now)
 if(period==='today'){start.setHours(0,0,0,0)}
 if(period==='7d'){start=new Date(now.getTime()-6*86400000);start.setHours(0,0,0,0)}
 if(period==='30d'){start=new Date(now.getTime()-29*86400000);start.setHours(0,0,0,0)}
 if(period==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);start.setHours(0,0,0,0)}
 if(period==='custom'){
  start=from?new Date(`${from}T00:00:00`):new Date(now.getFullYear(),now.getMonth(),1)
  end=to?new Date(`${to}T23:59:59.999`):now
 }
 return{start,end}
}
function csvCell(v:any){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`}
function downloadCsv(name:string,rows:any[]){
 if(!rows.length)return
 const keys:string[]=[]
 rows.forEach((r:any)=>Object.keys(r||{}).forEach((k:string)=>{if(!keys.includes(k))keys.push(k)}))
 const csv=[keys.map(csvCell).join(','),...rows.map((r:any)=>keys.map((k:string)=>csvCell(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\n')
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)
}

export function AdminReportsCenter(){
 const[period,setPeriod]=useState<Period>('30d'),[view,setView]=useState<View>('operations')
 const[from,setFrom]=useState(dateInput(new Date(Date.now()-29*86400000))),[to,setTo]=useState(dateInput(new Date()))
 const[data,setData]=useState<ReportData>(empty),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[updated,setUpdated]=useState<Date|null>(null)
 const{start,end}=useMemo(()=>rangeFor(period,from,to),[period,from,to])
 const load=useCallback(async()=>{
  setLoading(true);setError(null)
  const s=start.toISOString(),e=end.toISOString()
  const results=await Promise.all([
   supabase.from('servicios').select('id,numero,estado,tarifa,comision_ugo,ganancia_proveedor,categoria_id,proveedor_id,cliente_id,created_at,completado_at,cancelado_at,categoria:categorias!servicios_categoria_id_fkey(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,apellido)').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(1000),
   supabase.from('pagos').select('id,servicio_id,monto_bruto,comision_ugo,ganancia_proveedor,estado,metodo,created_at,liberado_at,reembolsado_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(1000),
   supabase.from('usuarios').select('id,nombre,apellido,tipo,activo,created_at,fecha_registro,servicios_completados,karma').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(1000),
   supabase.from('disputas').select('id,servicio_id,estado,motivo,created_at,resuelta_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(1000),
   supabase.from('resenas').select('id,servicio_id,proveedor_id,puntuacion,created_at').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(1000),
   supabase.from('perfiles_proveedor').select('usuario_id,estado_verificacion,online,disponible,created_at').limit(1000)
  ])
  const firstError=results.find((r:any)=>r.error)?.error
  if(firstError){setError(firstError.message||'No se pudieron cargar los reportes');setLoading(false);return}
  setData({services:results[0].data||[],payments:results[1].data||[],users:results[2].data||[],disputes:results[3].data||[],reviews:results[4].data||[],providers:results[5].data||[]})
  setUpdated(new Date());setLoading(false)
 },[start.getTime(),end.getTime()])
 useEffect(()=>{void load()},[load])
 const stats=useMemo(()=>{
  const completed=data.services.filter(s=>s.estado==='completado').length,canceled=data.services.filter(s=>s.estado==='cancelado').length,active=data.services.filter(s=>!['completado','cancelado'].includes(s.estado)).length
  const gross=data.payments.reduce((a,p)=>a+Number(p.monto_bruto||0),0),commission=data.payments.reduce((a,p)=>a+Number(p.comision_ugo||0),0),providerNet=data.payments.reduce((a,p)=>a+Number(p.ganancia_proveedor||0),0)
  const clients=data.users.filter(u=>u.tipo==='cliente').length,newProviders=data.users.filter(u=>u.tipo==='proveedor').length,verified=data.providers.filter(p=>p.estado_verificacion==='verificado').length,online=data.providers.filter(p=>p.online&&p.disponible).length
  const avgRating=data.reviews.length?data.reviews.reduce((a,r)=>a+Number(r.puntuacion||0),0)/data.reviews.length:0
  return{completed,canceled,active,gross,commission,providerNet,clients,newProviders,verified,online,avgRating,disputes:data.disputes.length,total:data.services.length}
 },[data])
 const topCategories=useMemo(()=>Object.values(data.services.reduce((m:any,s:any)=>{const k=s.categoria_id||'sin';if(!m[k])m[k]={name:s.categoria?.nombre||'Sin categoría',emoji:s.categoria?.emoji||'•',count:0,completed:0};m[k].count++;if(s.estado==='completado')m[k].completed++;return m},{})).sort((a:any,b:any)=>b.count-a.count).slice(0,6) as any[],[data.services])
 const topProviders=useMemo(()=>Object.values(data.services.reduce((m:any,s:any)=>{if(!s.proveedor_id)return m;const k=s.proveedor_id;if(!m[k])m[k]={name:[s.proveedor?.nombre,s.proveedor?.apellido].filter(Boolean).join(' ')||'Proveedor',count:0,completed:0};m[k].count++;if(s.estado==='completado')m[k].completed++;return m},{})).sort((a:any,b:any)=>b.completed-a.completed||b.count-a.count).slice(0,6) as any[],[data.services])
 const exportCurrent=()=>{const rows=view==='operations'?data.services:view==='finance'?data.payments:view==='people'?data.users:view==='quality'?[...data.disputes,...data.reviews]:[];downloadCsv(`ugo-${view}-${dateInput(start)}-${dateInput(end)}.csv`,rows)}
 if(error)return <div className="ugo-reports-state error"><strong>No se pudieron cargar los reportes</strong><span>{error}</span><button onClick={()=>void load()}>Reintentar</button></div>
 return <div className="ugo-reports">
  <section className="ugo-reports-hero"><div><small>CENTRO DE REPORTES</small><h3>Rendimiento de UGO</h3><p>Operación, finanzas, personas y calidad sobre datos reales del período seleccionado.</p></div><div><button onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button><button className="primary" onClick={exportCurrent} disabled={loading}>Exportar CSV</button></div></section>
  <section className="ugo-reports-period"><div className="ugo-reports-pills">{([['today','Hoy'],['7d','7 días'],['30d','30 días'],['month','Mes'],['custom','Personalizado']] as [Period,string][]).map(([k,l])=><button key={k} className={period===k?'active':''} onClick={()=>setPeriod(k)}>{l}</button>)}</div>{period==='custom'&&<div className="ugo-reports-dates"><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}<span>{start.toLocaleDateString('es-AR')} → {end.toLocaleDateString('es-AR')}{updated?` · actualizado ${updated.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:''}</span></section>
  <section className="ugo-reports-kpis"><article><small>SERVICIOS</small><strong>{stats.total}</strong><span>{stats.completed} completados</span></article><article><small>FACTURACIÓN</small><strong>{money(stats.gross)}</strong><span>{data.payments.length} pagos</span></article><article><small>COMISIÓN UGO</small><strong>{money(stats.commission)}</strong><span>{stats.gross?pct(stats.commission,stats.gross):'0%'}</span></article><article><small>CALIDAD</small><strong>{stats.avgRating?stats.avgRating.toFixed(1):'—'}</strong><span>{data.reviews.length} reseñas</span></article></section>
  <nav className="ugo-reports-tabs">{([['operations','Operación'],['finance','Finanzas'],['people','Personas'],['quality','Calidad']] as [View,string][]).map(([k,l])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</nav>
  {loading?<div className="ugo-reports-state">Cargando reporte…</div>:<>
   {view==='operations'&&<div className="ugo-reports-grid"><section><header><div><small>OPERACIÓN</small><h4>Estado de servicios</h4></div></header><div className="ugo-reports-metrics"><div><span>Completados</span><b>{stats.completed}</b></div><div><span>Activos</span><b>{stats.active}</b></div><div><span>Cancelados</span><b>{stats.canceled}</b></div><div><span>Tasa de cierre</span><b>{pct(stats.completed,stats.completed+stats.canceled)}</b></div></div></section><section><header><div><small>CATEGORÍAS</small><h4>Más solicitadas</h4></div></header><div className="ugo-reports-ranking">{topCategories.map((x:any,i)=><div key={i}><span>{x.emoji} {x.name}</span><b>{x.count}</b><small>{x.completed} completados</small></div>)}{!topCategories.length&&<p>Sin servicios en este período.</p>}</div></section><section className="wide"><header><div><small>PROVEEDORES</small><h4>Actividad del período</h4></div></header><div className="ugo-reports-ranking providers">{topProviders.map((x:any,i)=><div key={i}><span>{x.name}</span><b>{x.completed}</b><small>{x.count} asignados</small></div>)}{!topProviders.length&&<p>Sin proveedores asignados.</p>}</div></section></div>}
   {view==='finance'&&<div className="ugo-reports-grid"><section><header><div><small>FINANZAS</small><h4>Movimiento del período</h4></div></header><div className="ugo-reports-metrics"><div><span>Bruto</span><b>{money(stats.gross)}</b></div><div><span>Comisión UGO</span><b>{money(stats.commission)}</b></div><div><span>Neto proveedores</span><b>{money(stats.providerNet)}</b></div><div><span>Ticket medio</span><b>{money(data.payments.length?stats.gross/data.payments.length:0)}</b></div></div></section><section><header><div><small>PAGOS</small><h4>Estado</h4></div></header><div className="ugo-reports-ranking">{Object.entries(data.payments.reduce((m:any,p:any)=>{m[p.estado]=(m[p.estado]||0)+1;return m},{})).map(([k,v]:any)=><div key={k}><span>{String(k).replace(/_/g,' ')}</span><b>{v}</b></div>)}{!data.payments.length&&<p>Sin pagos en el período.</p>}</div></section></div>}
   {view==='people'&&<div className="ugo-reports-grid"><section><header><div><small>PERSONAS</small><h4>Nuevas altas</h4></div></header><div className="ugo-reports-metrics"><div><span>Clientes nuevos</span><b>{stats.clients}</b></div><div><span>Proveedores nuevos</span><b>{stats.newProviders}</b></div><div><span>Proveedores verificados</span><b>{stats.verified}</b></div><div><span>Online ahora</span><b>{stats.online}</b></div></div></section><section><header><div><small>USUARIOS</small><h4>Distribución de altas</h4></div></header><div className="ugo-reports-ranking">{Object.entries(data.users.reduce((m:any,u:any)=>{m[u.tipo]=(m[u.tipo]||0)+1;return m},{})).map(([k,v]:any)=><div key={k}><span>{String(k)}</span><b>{v}</b></div>)}{!data.users.length&&<p>Sin altas en el período.</p>}</div></section></div>}
   {view==='quality'&&<div className="ugo-reports-grid"><section><header><div><small>CALIDAD</small><h4>Indicadores</h4></div></header><div className="ugo-reports-metrics"><div><span>Rating promedio</span><b>{stats.avgRating?stats.avgRating.toFixed(2):'—'}</b></div><div><span>Reseñas</span><b>{data.reviews.length}</b></div><div><span>Disputas</span><b>{stats.disputes}</b></div><div><span>Cancelación</span><b>{pct(stats.canceled,stats.total)}</b></div></div></section><section><header><div><small>RESEÑAS</small><h4>Distribución</h4></div></header><div className="ugo-reports-ranking">{[5,4,3,2,1].map(n=><div key={n}><span>{n} estrellas</span><b>{data.reviews.filter(r=>Number(r.puntuacion)===n).length}</b></div>)}</div></section></div>}
  </>}
 </div>
}
