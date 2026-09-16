import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./development-dashboard.css'

type ChecklistStatus='pending'|'in_progress'|'implemented'|'validated'|'blocked'|'failed'|'approved'
type Priority='P0'|'P1'|'P2'|'P3'
type ChecklistItem={id:string;code:string;area:string;title:string;description:string;priority:Priority;status:ChecklistStatus;weight:number;position:number;test_required:boolean;completed_at:string|null;updated_at:string;has_evidence:boolean}
type ChecklistEvent={id:number;checklist_id:string;code:string;old_status:ChecklistStatus|null;new_status:ChecklistStatus;changed_at:string}
type SentinelIncident={id:string;severity:Priority;source_role:string;event_type:string;status:'open'|'acknowledged'|'resolved';route:string|null;action:string|null;checklist_code:string|null;message:string;occurrences:number;first_seen_at:string;last_seen_at:string;runtime_revision:string|null}

const STATUS_LABEL:Record<ChecklistStatus,string>={pending:'Pendiente',in_progress:'En progreso',implemented:'Implementado · falta validar',validated:'Validado técnicamente',blocked:'Bloqueado',failed:'Falló la prueba',approved:'Aprobado'}
const STATUS_ORDER:ChecklistStatus[]=['failed','in_progress','implemented','validated','blocked','pending','approved']
const FILTERS:[string,string][]=[['all','Todo'],['P0','P0'],['failed','Falló'],['blocked','Bloqueado'],['implemented','Implementado'],['validated','Validado'],['approved','Aprobado']]
const RUNTIME_REVISION=String(import.meta.env.VITE_APP_REVISION||'local').slice(0,80)

function pct(value:number,total:number){return total?Math.round(value*100/total):0}
function formatWhen(value:string|null){if(!value)return'—';return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function statusRank(status:ChecklistStatus){const i=STATUS_ORDER.indexOf(status);return i<0?99:i}
function isCurrentRevision(incident:SentinelIncident){return Boolean(incident.runtime_revision)&&incident.runtime_revision===RUNTIME_REVISION}

export function DevelopmentDashboard(){
 const[items,setItems]=useState<ChecklistItem[]>([]),[events,setEvents]=useState<ChecklistEvent[]>([]),[incidents,setIncidents]=useState<SentinelIncident[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[live,setLive]=useState(false),[filter,setFilter]=useState('all')

 const load=useCallback(async()=>{
  const client=supabase as any
  const[{data:itemData,error:itemError},{data:eventData,error:eventError},{data:incidentData,error:incidentError}]=await Promise.all([
   client.from('development_checklist_public').select('id,code,area,title,description,priority,status,weight,position,test_required,completed_at,updated_at,has_evidence').order('position',{ascending:true}),
   client.from('development_checklist_events_public').select('id,checklist_id,code,old_status,new_status,changed_at').order('changed_at',{ascending:false}).limit(40),
   client.from('development_incidents_public').select('id,severity,source_role,event_type,status,route,action,checklist_code,message,occurrences,first_seen_at,last_seen_at,runtime_revision').order('last_seen_at',{ascending:false}).limit(30),
  ])
  if(itemError||eventError||incidentError){setError(itemError?.message||eventError?.message||incidentError?.message||'No pudimos cargar el panel.');setLoading(false);return}
  setItems((itemData||[])as ChecklistItem[]);setEvents((eventData||[])as ChecklistEvent[]);setIncidents((incidentData||[])as SentinelIncident[]);setError('');setLoading(false)
 },[])

 useEffect(()=>{
  document.title='UGO · Desarrollo'
  load()
  const interval=window.setInterval(load,15000)
  const channel=(supabase as any).channel('ugo-development-public-signal').on('postgres_changes',{event:'UPDATE',schema:'public',table:'development_dashboard_signal',filter:'id=eq.1'},()=>load()).subscribe((state:string)=>setLive(state==='SUBSCRIBED'))
  return()=>{window.clearInterval(interval);(supabase as any).removeChannel(channel)}
 },[load])

 const stats=useMemo(()=>{
  const totalWeight=items.reduce((sum,item)=>sum+Number(item.weight||1),0)
  const approvedWeight=items.filter(item=>item.status==='approved').reduce((sum,item)=>sum+Number(item.weight||1),0)
  const approved=items.filter(item=>item.status==='approved').length
  const validated=items.filter(item=>item.status==='validated').length
  const p0Open=items.filter(item=>item.priority==='P0'&&item.status!=='approved').length
  const p1Open=items.filter(item=>item.priority==='P1'&&item.status!=='approved').length
  const failed=items.filter(item=>item.status==='failed').length
  const unverified=items.filter(item=>item.status==='implemented').length
  const today=items.filter(item=>item.completed_at&&new Date(item.completed_at).toDateString()===new Date().toDateString()).length
  const currentIncidents=incidents.filter(item=>item.status!=='resolved'&&isCurrentRevision(item))
  const sentinelOpen=currentIncidents.length
  const sentinelP0=currentIncidents.filter(item=>item.severity==='P0').length
  const sentinelP1=currentIncidents.filter(item=>item.severity==='P1').length
  const historicalOpen=incidents.filter(item=>item.status!=='resolved'&&!isCurrentRevision(item)).length
  return{verified:pct(approvedWeight,totalWeight),approved,validated,total:items.length,p0Open,p1Open,failed,unverified,today,totalWeight,approvedWeight,sentinelOpen,sentinelP0,sentinelP1,historicalOpen}
 },[incidents,items])

 const releaseReady=!error&&items.length>0&&stats.p0Open===0&&stats.p1Open===0&&stats.sentinelP0===0&&stats.sentinelP1===0
 const areas=useMemo(()=>Array.from(new Set(items.map(item=>item.area))).map(area=>{const rows=items.filter(item=>item.area===area),total=rows.reduce((sum,item)=>sum+item.weight,0),done=rows.filter(item=>item.status==='approved').reduce((sum,item)=>sum+item.weight,0);return{area,total:rows.length,approved:rows.filter(item=>item.status==='approved').length,progress:pct(done,total)}}).sort((a,b)=>a.area.localeCompare(b.area)),[items])
 const nextP0=useMemo(()=>items.filter(item=>item.priority==='P0'&&item.status!=='approved').sort((a,b)=>statusRank(a.status)-statusRank(b.status)||a.position-b.position)[0]||null,[items])
 const visible=useMemo(()=>items.filter(item=>filter==='all'||item.priority===filter||item.status===filter),[items,filter])

 if(loading)return <main className="devdash devdash-center" aria-live="polite"><div className="devdash-loader"/><p>Cargando estado real de UGO…</p></main>

 return <main className="devdash">
  <header className="devdash-topbar">
   <a className="devdash-brand" href="/">UGO <span>Desarrollo</span></a>
   <div className="devdash-top-actions"><span className={`devdash-live ${live?'on':''}`}><i/>{live?'En vivo':'Actualizando'}</span><a href="/landing/">Ver landing</a><a href="/?app=admin">Admin</a></div>
  </header>

  <section className="devdash-hero">
   <div className="devdash-hero-copy"><p className="devdash-kicker">ESTADO DEL PRODUCTO · {releaseReady?'READY':'NOT READY'}</p><h1>{releaseReady?'UGO listo para operar':'UGO todavía no está listo'}</h1><p>{releaseReady?'No quedan bloqueos P0/P1 ni incidentes críticos del build actual.':'Código, validación, prueba real e incidentes runtime se muestran por separado. Los incidentes de builds anteriores quedan como historial y no falsean el candidato actual.'}</p><div className="devdash-hero-badges"><span>{stats.approved}/{stats.total} aprobadas</span><span>{stats.validated} validadas</span><span>{stats.unverified} sin validar</span><span>build {RUNTIME_REVISION.slice(0,8)}</span></div></div>
   <div className="devdash-progress-card"><div className="devdash-ring" style={{'--progress':`${stats.verified*3.6}deg`} as React.CSSProperties}><div><b>{stats.verified}%</b><span>avance real</span></div></div><p><strong>{stats.approvedWeight}</strong> de {stats.totalWeight} puntos aprobados</p></div>
  </section>

  {error&&<div className="devdash-alert" role="alert">{error}</div>}

  <section className="devdash-metrics" aria-label="Métricas de cierre">
   <article className="tone-green"><span>Avance real</span><strong>{stats.verified}%</strong><small>aprobado con evidencia</small></article>
   <article className="tone-red"><span>P0 abiertos</span><strong>{stats.p0Open}</strong><small>bloquean el primer cliente</small></article>
   <article className="tone-orange"><span>P1 abiertos</span><strong>{stats.p1Open}</strong><small>requieren validación o desbloqueo</small></article>
   <article className="tone-blue"><span>Sentinela · build actual</span><strong>{stats.sentinelOpen}</strong><small>{stats.sentinelP0} P0 · {stats.sentinelP1} P1 · {stats.historicalOpen} históricos</small></article>
  </section>

  {nextP0&&<section className="devdash-next"><div className="devdash-next-icon">!</div><div className="devdash-next-copy"><span>PRÓXIMO P0 A RESOLVER</span><h2>{nextP0.title}</h2><p>{nextP0.description}</p></div><div className={`devdash-pill status-${nextP0.status}`}>{STATUS_LABEL[nextP0.status]}</div></section>}

  <section className="devdash-layout">
   <div className="devdash-main">
    <div className="devdash-section-head"><div><p className="devdash-kicker">CHECKLIST MAESTRO</p><h2>Qué falta para salir</h2><p className="devdash-section-copy">Vista pública de solo lectura. Evidencia, identidades y datos internos permanecen protegidos en Admin.</p></div><div className="devdash-filters">{FILTERS.map(([value,label])=><button key={value} type="button" className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
    <div className="devdash-list">{visible.map(item=><article key={item.id} className={`devdash-task status-${item.status}`}>
     <div className="devdash-task-main"><div className="devdash-task-meta"><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span><span>{item.area}</span><code>{item.code}</code></div><div className="devdash-task-title-row"><h3>{item.title}</h3><span className={`devdash-pill status-${item.status}`}>{STATUS_LABEL[item.status]}</span></div><p>{item.description}</p><div className="devdash-task-state"><span>Actualizado {formatWhen(item.updated_at)}</span><span>{item.has_evidence?'Evidencia registrada':'Sin evidencia pública'}</span>{item.completed_at&&<span>Aprobado {formatWhen(item.completed_at)}</span>}</div></div>
    </article>)}</div>
   </div>

   <aside className="devdash-side">
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">POR ÁREA</p><h2>Salud del ecosistema</h2></div></div><div className="devdash-area-list">{areas.map(row=><div className="devdash-area" key={row.area}><div><strong>{row.area}</strong><span>{row.approved}/{row.total}</span></div><div className="devdash-bar"><i style={{width:`${row.progress}%`}}/></div><small>{row.progress}% aprobado</small></div>)}</div></section>
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">SENTINELA</p><h2>Incidentes recientes</h2></div></div><div className="devdash-incidents">{incidents.length===0?<p className="devdash-empty">Sin incidentes capturados.</p>:incidents.slice(0,8).map(incident=>{const current=isCurrentRevision(incident);return <article key={incident.id} className={`devdash-incident severity-${incident.severity.toLowerCase()} status-${incident.status}`}><div><span className={`priority ${incident.severity.toLowerCase()}`}>{incident.severity}</span><strong>{incident.event_type}</strong>{incident.occurrences>1&&<b>×{incident.occurrences}</b>}</div><p>{incident.message}</p><small>{incident.source_role}{incident.action?` · ${incident.action}`:''}{incident.checklist_code?` · ${incident.checklist_code}`:''}</small><small>{formatWhen(incident.last_seen_at)} · {current?'BUILD ACTUAL':`histórico · build ${incident.runtime_revision?incident.runtime_revision.slice(0,8):'sin versión'}`}</small></article>})}</div></section>
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">ACTIVIDAD</p><h2>Últimos cambios</h2></div></div><div className="devdash-events">{events.length===0?<p className="devdash-empty">Todavía no hay movimientos registrados.</p>:events.slice(0,10).map(event=><div key={event.id}><span className={`event-dot status-${event.new_status}`}/><div><strong>{items.find(item=>item.code===event.code)?.title||event.code}</strong><p>{event.old_status?`${STATUS_LABEL[event.old_status]} → `:''}{STATUS_LABEL[event.new_status]}</p><small>{formatWhen(event.changed_at)}</small></div></div>)}</div></section>
   </aside>
  </section>
 </main>
}
