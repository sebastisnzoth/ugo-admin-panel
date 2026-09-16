import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{reportSentinelIncident}from'../../lib/sentinel'
import{ServiceChat}from'../ServiceChat'
import{money,useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'

type AgendaCategory={nombre?:string|null;emoji?:string|null}
type AgendaRow={
 id:string
 numero:number|null
 estado:string
 descripcion:string|null
 direccion_cliente:string|null
 programado_para:string|null
 tarifa:number|null
 ganancia_proveedor:number|null
 moneda:string|null
 categoria:AgendaCategory|null
}

const AGENDA_STATES=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const STATE_LABELS:Record<string,string>={asignado:'Asignado',en_camino:'En camino',llegado:'En el lugar',en_progreso:'En curso',esperando_aprobacion:'Esperando aprobación'}

function scheduleLabel(value:string|null){if(!value)return'Atención inmediata';const date=new Date(value);return Number.isNaN(date.getTime())?'Horario por confirmar':date.toLocaleString('es-AR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}
function relativeLabel(value:string|null){if(!value)return'Ahora';const time=new Date(value).getTime();if(!Number.isFinite(time))return'';const minutes=Math.round((time-Date.now())/60000);if(Math.abs(minutes)<2)return'Ahora';if(minutes>0&&minutes<60)return`En ${minutes} min`;if(minutes>=60&&minutes<1440)return`En ${Math.round(minutes/60)} h`;if(minutes>=1440)return`En ${Math.round(minutes/1440)} día${Math.round(minutes/1440)===1?'':'s'}`;return'Hora programada alcanzada'}

export function ProviderAgenda(){
 const db=useMemo(()=>getRoleSupabase('provider'),[]),flow=useProviderFlow(),provider=useProviderData()
 const[userId,setUserId]=useState<string|null>(null),[rows,setRows]=useState<AgendaRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selectedId,setSelectedId]=useState<string|null>(null)
 const reportAgenda=useCallback((eventType:string,message:string,cause?:unknown)=>{void reportSentinelIncident({eventType,message,error:cause,role:'provider',severity:'P1',action:'provider.agenda.load',checklistCode:'PROVIDER-AGENDA'})},[])
 const load=useCallback(async(id:string)=>{setLoading(true);setError('');try{const{data,error:queryError}=await db.from('servicios').select('id,numero,estado,descripcion,direccion_cliente,programado_para,tarifa,ganancia_proveedor,moneda,categoria:categorias(nombre,emoji)').eq('proveedor_id',id).in('estado',AGENDA_STATES).order('programado_para',{ascending:true,nullsFirst:true}).limit(50);if(queryError)throw queryError;setRows((data||[])as unknown as AgendaRow[])}catch(loadError){const message=loadError instanceof Error?loadError.message:'No pudimos cargar tu agenda.';setError(message);reportAgenda('provider_agenda_load_error',message,loadError)}finally{setLoading(false)}},[db,reportAgenda])
 useEffect(()=>{let alive=true;let channel:ReturnType<typeof db.channel>|null=null;db.auth.getSession().then(({data})=>{const id=data.session?.user.id||null;if(!alive)return;setUserId(id);if(!id){setLoading(false);return}void load(id);channel=db.channel(`provider-agenda-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${id}`},()=>void load(id)).subscribe(status=>{if(status==='SUBSCRIBED')void load(id);else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){reportAgenda('provider_agenda_realtime_error',`Canal agenda: ${status}`);void load(id)}})}).catch(sessionError=>{if(alive){const message=sessionError instanceof Error?sessionError.message:'No pudimos iniciar tu agenda.';setError(message);setLoading(false);reportAgenda('provider_agenda_session_error',message,sessionError)}});return()=>{alive=false;if(channel)void db.removeChannel(channel)}},[db,load,reportAgenda])
 const now=Date.now(),todayStart=new Date();todayStart.setHours(0,0,0,0);const tomorrowStart=todayStart.getTime()+86400000
 const immediateRows=rows.filter(row=>!row.programado_para||new Date(row.programado_para).getTime()<todayStart.getTime())
 const todayRows=rows.filter(row=>{if(!row.programado_para)return false;const time=new Date(row.programado_para).getTime();return time>=todayStart.getTime()&&time<tomorrowStart})
 const upcomingRows=rows.filter(row=>row.programado_para&&new Date(row.programado_para).getTime()>=tomorrowStart)
 const active=rows.find(row=>provider.service?.id===row.id)||null
 const next=active||immediateRows[0]||todayRows.find(row=>new Date(row.programado_para||0).getTime()>=now)||todayRows[0]||upcomingRows[0]||null
 const selected=rows.find(row=>row.id===selectedId)||null
 const card=(row:AgendaRow)=>{const current=provider.service?.id===row.id;return <article className="provider-card provider-opportunity" key={row.id}><div className="provider-opportunity-main"><div className="provider-opportunity-meta"><span className="provider-chip">{current?'Servicio activo':STATE_LABELS[row.estado]||row.estado}</span><span>#{row.numero??String(row.id).slice(0,8)}</span></div><h2>{row.categoria?.emoji||'🧰'} {row.categoria?.nombre||'Servicio UGO'}</h2><p>🗓 {scheduleLabel(row.programado_para)}</p><p>📍 {row.direccion_cliente||'Dirección por confirmar'}</p>{row.descripcion&&<p>{row.descripcion}</p>}<strong className="provider-price">{money(row.ganancia_proveedor||row.tarifa,row.moneda||'BRL')}</strong><span className="provider-match">{relativeLabel(row.programado_para)}</span></div>{current?<button type="button" className="provider-primary" onClick={flow.actions.openActiveJob}>Abrir trabajo</button>:<button type="button" className="provider-secondary" onClick={()=>setSelectedId(row.id)}>Ver detalle</button>}</article>}
 return <section className="provider-screen" aria-labelledby="provider-agenda-title">
  <header className="provider-section-head"><div><span className="provider-kicker">AGENDA UGO</span><h1 id="provider-agenda-title">Mis trabajos</h1><p>Asignaciones inmediatas y horarios confirmados de tu cuenta. Cada tarjeta conserva su propio serviceId.</p></div><button type="button" className="provider-link" onClick={flow.actions.openHistory}>Ver historial</button></header>
  {next&&!loading&&!error&&<article className="provider-priority-summary"><small>{provider.service?.id===next.id?'SERVICIO ACTIVO':'SIGUIENTE'}</small><strong>{next.categoria?.emoji||'🧰'} {next.categoria?.nombre||'Servicio UGO'}</strong><span>{scheduleLabel(next.programado_para)} · {relativeLabel(next.programado_para)}</span>{provider.service?.id===next.id?<button type="button" className="provider-secondary" onClick={flow.actions.openActiveJob}>Abrir trabajo</button>:<button type="button" className="provider-secondary" onClick={()=>setSelectedId(next.id)}>Ver detalle</button>}</article>}
  {loading&&<article className="provider-card provider-empty"><strong>Cargando agenda…</strong><span>Estamos leyendo todos tus trabajos asignados.</span></article>}
  {error&&<article className="provider-card provider-empty" role="alert"><strong>No pudimos cargar tu agenda</strong><span>{error}</span>{userId&&<button type="button" className="provider-secondary provider-wide" onClick={()=>void load(userId)}>Reintentar</button>}</article>}
  {!loading&&!error&&rows.length===0&&<article className="provider-card provider-empty"><strong>No tenés trabajos asignados</strong><span>Cuando aceptes un pedido, inmediato o programado, va a aparecer acá automáticamente.</span><button type="button" className="provider-secondary provider-wide" onClick={flow.actions.openOpportunities}>Ver oportunidades</button></article>}
  {!loading&&!error&&immediateRows.length>0&&<div className="provider-agenda-group"><span className="provider-kicker">AHORA</span><div className="provider-list">{immediateRows.map(card)}</div></div>}
  {!loading&&!error&&todayRows.length>0&&<div className="provider-agenda-group"><span className="provider-kicker">HOY</span><div className="provider-list">{todayRows.map(card)}</div></div>}
  {!loading&&!error&&upcomingRows.length>0&&<div className="provider-agenda-group"><span className="provider-kicker">PRÓXIMOS</span><div className="provider-list">{upcomingRows.map(card)}</div></div>}
  {selected&&<div className="ugo-dispute-backdrop" onClick={()=>setSelectedId(null)}><section className="ugo-dispute-sheet" onClick={event=>event.stopPropagation()}><header><div><small>TRABAJO · #{selected.numero??String(selected.id).slice(0,8)}</small><h3>{selected.categoria?.emoji||'🧰'} {selected.categoria?.nombre||'Servicio UGO'}</h3></div><button type="button" onClick={()=>setSelectedId(null)}>×</button></header><div className="ugo-dispute-note"><b>{scheduleLabel(selected.programado_para)}</b><span>{selected.direccion_cliente||'Dirección por confirmar'}</span>{selected.descripcion&&<span>{selected.descripcion}</span>}<span>{STATE_LABELS[selected.estado]||selected.estado}</span></div><ServiceChat role="provider" serviceId={selected.id} compact/>{provider.service?.id===selected.id&&<button type="button" className="provider-primary provider-wide" onClick={()=>{setSelectedId(null);flow.actions.openActiveJob()}}>Abrir misión activa</button>}<footer>Este detalle está ligado al serviceId exacto. Abrirlo no cambia el estado de otros trabajos de tu agenda.</footer></section></div>}
 </section>
}

export default ProviderAgenda
