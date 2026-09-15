import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./development-dashboard.css'

type ChecklistStatus='pending'|'in_progress'|'implemented'|'validated'|'blocked'|'failed'|'approved'
type Priority='P0'|'P1'|'P2'|'P3'
type ChecklistItem={id:string;code:string;area:string;title:string;description:string;priority:Priority;status:ChecklistStatus;weight:number;position:number;evidence:string|null;test_required:boolean;completed_at:string|null;updated_at:string;updated_by:string|null}
type ChecklistEvent={id:number;checklist_id:string;code:string;old_status:ChecklistStatus|null;new_status:ChecklistStatus;evidence:string|null;changed_at:string;changed_by:string|null}
type SentinelIncident={id:string;severity:Priority;source_role:string;event_type:string;status:'open'|'acknowledged'|'resolved';route:string|null;action:string|null;service_id:string|null;checklist_code:string|null;message:string;occurrences:number;first_seen_at:string;last_seen_at:string}

const STATUS_LABEL:Record<ChecklistStatus,string>={pending:'Pendiente',in_progress:'En progreso',implemented:'Implementado · falta validar',validated:'Validado técnicamente',blocked:'Bloqueado',failed:'Falló la prueba',approved:'Aprobado'}
const STATUS_ORDER:ChecklistStatus[]=['failed','in_progress','implemented','validated','blocked','pending','approved']
const FILTERS:[string,string][]=[['all','Todo'],['P0','P0'],['failed','Falló'],['blocked','Bloqueado'],['implemented','Implementado'],['validated','Validado'],['approved','Aprobado']]

function pct(value:number,total:number){return total?Math.round(value*100/total):0}
function formatWhen(value:string|null){if(!value)return'—';return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function statusRank(status:ChecklistStatus){const i=STATUS_ORDER.indexOf(status);return i<0?99:i}

export function DevelopmentDashboard(){
 const[items,setItems]=useState<ChecklistItem[]>([]),[events,setEvents]=useState<ChecklistEvent[]>([]),[incidents,setIncidents]=useState<SentinelIncident[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[live,setLive]=useState(false),[filter,setFilter]=useState('all'),[saving,setSaving]=useState<string|null>(null),[drafts,setDrafts]=useState<Record<string,string>>({})

 const load=useCallback(async()=>{
  const client=supabase as any
  const[{data:itemData,error:itemError},{data:eventData,error:eventError},{data:incidentData}]=await Promise.all([
   client.from('development_checklist').select('*').order('position',{ascending:true}),
   client.from('development_checklist_events').select('*').order('changed_at',{ascending:false}).limit(40),
   client.from('development_incidents').select('id,severity,source_role,event_type,status,route,action,service_id,checklist_code,message,occurrences,first_seen_at,last_seen_at').order('last_seen_at',{ascending:false}).limit(30),
  ])
  if(itemError||eventError){setError(itemError?.message||eventError?.message||'No pudimos cargar el panel.');setLoading(false);return}
  const nextItems=(itemData||[])as ChecklistItem[]
  setItems(nextItems);setEvents((eventData||[])as ChecklistEvent[]);setIncidents((incidentData||[])as SentinelIncident[]);setDrafts(current=>{const next={...current};for(const item of nextItems)if(next[item.id]===undefined)next[item.id]=item.evidence||'';return next});setError('');setLoading(false)
 },[])

 useEffect(()=>{document.title='UGO · Desarrollo';load();const channel=(supabase as any).channel('ugo-development-readiness-live').on('postgres_changes',{event:'*',schema:'public',table:'development_checklist'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'development_checklist_events'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'development_incidents'},()=>load()).subscribe((state:string)=>setLive(state==='SUBSCRIBED'));return()=>{(supabase as any).removeChannel(channel)}},[load])

 const stats=useMemo(()=>{
  const totalWeight=items.reduce((sum,item)=>sum+Number(item.weight||1),0)
  const approvedWeight=items.filter(item=>item.status==='approved').reduce((sum,item)=>sum+Number(item.weight||1),0)
  const approved=items.filter(item=>item.status==='approved').length
  const validated=items.filter(item=>item.status==='validated').length
  const p0Open=items.filter(item=>item.priority==='P0'&&item.status!=='approved').length
  const failed=items.filter(item=>item.status==='failed').length
  const unverified=items.filter(item=>item.status==='implemented').length
  const today=items.filter(item=>item.completed_at&&new Date(item.completed_at).toDateString()===new Date().toDateString()).length
  const sentinelOpen=incidents.filter(item=>item.status!=='resolved').length
  const sentinelP0=incidents.filter(item=>item.status!=='resolved'&&item.severity==='P0').length
  return{verified:pct(approvedWeight,totalWeight),approved,validated,total:items.length,p0Open,failed,unverified,today,totalWeight,approvedWeight,sentinelOpen,sentinelP0}
 },[incidents,items])

 const areas=useMemo(()=>Array.from(new Set(items.map(item=>item.area))).map(area=>{const rows=items.filter(item=>item.area===area),total=rows.reduce((sum,item)=>sum+item.weight,0),done=rows.filter(item=>item.status==='approved').reduce((sum,item)=>sum+item.weight,0);return{area,total:rows.length,approved:rows.filter(item=>item.status==='approved').length,progress:pct(done,total)}}).sort((a,b)=>a.area.localeCompare(b.area)),[items])
 const nextP0=useMemo(()=>items.filter(item=>item.priority==='P0'&&item.status!=='approved').sort((a,b)=>statusRank(a.status)-statusRank(b.status)||a.position-b.position)[0]||null,[items])
 const visible=useMemo(()=>items.filter(item=>filter==='all'||item.priority===filter||item.status===filter),[items,filter])

 async function save(item:ChecklistItem,status:ChecklistStatus){
  const evidence=(drafts[item.id]??item.evidence??'').trim()
  if(status==='approved'&&!evidence){setError(`No se puede aprobar “${item.title}” sin evidencia de prueba.`);return}
  setSaving(item.id);setError('')
  try{
   const{data:{session}}=await supabase.auth.getSession()
   const{error:updateError}=await (supabase as any).from('development_checklist').update({status,evidence:evidence||null,updated_by:session?.user?.id||null}).eq('id',item.id)
   if(updateError)throw updateError
   await load()
  }catch(x){setError(x instanceof Error?x.message:'No pudimos actualizar la tarea.')}finally{setSaving(null)}
 }

 if(loading)return <main className="devdash devdash-center" aria-live="polite"><div className="devdash-loader"/><p>Cargando estado real de UGO…</p></main>

 return <main className="devdash">
  <header className="devdash-topbar"><a className="devdash-brand" href="/">UGO <span>Desarrollo</span></a><div className="devdash-top-actions"><span className={`devdash-live ${live?'on':''}`}><i/>{live?'Tiempo real':'Reconectando'}</span><a href="/?app=admin">Admin</a><a href="/landing/">Landing</a></div></header>

  <section className="devdash-hero">
   <div><p className="devdash-kicker">PREPARACIÓN PARA EL PRIMER CLIENTE REAL</p><h1>{stats.verified}% <span>verificado</span></h1><p>Este porcentaje sólo sube cuando una tarea queda <strong>aprobada con evidencia</strong>. Implementado y Validado se muestran separados hasta la prueba final.</p></div>
   <div className="devdash-ring" style={{'--progress':`${stats.verified*3.6}deg`} as React.CSSProperties}><div><b>{stats.approved}</b><span>de {stats.total}<br/>aprobadas</span></div></div>
  </section>

  {error&&<div className="devdash-alert" role="alert">{error}</div>}

  <section className="devdash-metrics" aria-label="Métricas de cierre">
   <article><span>Avance real</span><strong>{stats.verified}%</strong><small>{stats.approvedWeight}/{stats.totalWeight} puntos aprobados</small></article>
   <article><span>P0 abiertos</span><strong>{stats.p0Open}</strong><small>impiden el primer cliente</small></article>
   <article><span>Fallos activos</span><strong>{stats.failed}</strong><small>requieren solución + re-prueba</small></article>
   <article><span>Sentinela</span><strong>{stats.sentinelOpen}</strong><small>{stats.sentinelP0} incidentes P0 abiertos</small></article>
   <article><span>Sin validar</span><strong>{stats.unverified}</strong><small>{stats.validated} validadas técnicamente</small></article>
   <article><span>Aprobadas hoy</span><strong>{stats.today}</strong><small>movimiento del día</small></article>
  </section>

  {nextP0&&<section className="devdash-next"><div><span>PRÓXIMO BLOQUEO CRÍTICO</span><h2>{nextP0.title}</h2><p>{nextP0.description}</p></div><div className={`devdash-pill status-${nextP0.status}`}>{STATUS_LABEL[nextP0.status]}</div></section>}

  <section className="devdash-layout">
   <div className="devdash-main">
    <div className="devdash-section-head"><div><p className="devdash-kicker">CHECKLIST MAESTRO</p><h2>Todo lo que falta resolver</h2></div><div className="devdash-filters">{FILTERS.map(([value,label])=><button key={value} type="button" className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
    <div className="devdash-list">{visible.map(item=><article key={item.id} className={`devdash-task status-${item.status}`}>
     <div className="devdash-task-main"><div className="devdash-task-meta"><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span><span>{item.area}</span><code>{item.code}</code></div><h3>{item.title}</h3><p>{item.description}</p><div className="devdash-task-state"><span className={`devdash-pill status-${item.status}`}>{STATUS_LABEL[item.status]}</span><span>Actualizado {formatWhen(item.updated_at)}</span>{item.completed_at&&<span>Aprobado {formatWhen(item.completed_at)}</span>}</div></div>
     <div className="devdash-task-control"><label>Estado<select value={item.status} disabled={saving===item.id} onChange={e=>save(item,e.target.value as ChecklistStatus)}>{Object.entries(STATUS_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Evidencia<textarea value={drafts[item.id]??''} onChange={e=>setDrafts(current=>({...current,[item.id]:e.target.value}))} placeholder="Prueba, dispositivo, CI, serviceId o resultado verificable…"/></label><button type="button" disabled={saving===item.id} onClick={()=>save(item,item.status)}>{saving===item.id?'Guardando…':'Guardar evidencia'}</button></div>
    </article>)}</div>
   </div>

   <aside className="devdash-side">
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">SENTINELA</p><h2>Errores detectados</h2></div></div><div className="devdash-incidents">{incidents.length===0?<p className="devdash-empty">Todavía no hay incidentes capturados automáticamente.</p>:incidents.map(incident=><article key={incident.id} className={`devdash-incident severity-${incident.severity.toLowerCase()} status-${incident.status}`}><div><span className={`priority ${incident.severity.toLowerCase()}`}>{incident.severity}</span><strong>{incident.event_type}</strong>{incident.occurrences>1&&<b>×{incident.occurrences}</b>}</div><p>{incident.message}</p><small>{incident.source_role}{incident.action?` · ${incident.action}`:''}{incident.service_id?` · ${incident.service_id.slice(0,8)}`:''}</small><small>{formatWhen(incident.last_seen_at)}{incident.checklist_code?` · ${incident.checklist_code}`:''}</small></article>)}</div></section>
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">POR ÁREA</p><h2>Estado del ecosistema</h2></div></div><div className="devdash-area-list">{areas.map(row=><div className="devdash-area" key={row.area}><div><strong>{row.area}</strong><span>{row.approved}/{row.total}</span></div><div className="devdash-bar"><i style={{width:`${row.progress}%`}}/></div><small>{row.progress}% aprobado</small></div>)}</div></section>
    <section className="devdash-panel"><div className="devdash-section-head compact"><div><p className="devdash-kicker">REPORTE EN VIVO</p><h2>Últimos movimientos</h2></div></div><div className="devdash-events">{events.length===0?<p className="devdash-empty">Todavía no hay cambios registrados desde que se activó el panel.</p>:events.map(event=><div key={event.id}><span className={`event-dot status-${event.new_status}`}/><div><strong>{items.find(item=>item.code===event.code)?.title||event.code}</strong><p>{event.old_status?`${STATUS_LABEL[event.old_status]} → `:''}{STATUS_LABEL[event.new_status]}</p><small>{formatWhen(event.changed_at)}</small></div></div>)}</div></section>
   </aside>
  </section>
 </main>
}
