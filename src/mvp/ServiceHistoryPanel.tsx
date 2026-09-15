import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'
import'./provider-history.css'

type Role='client'|'provider'|'admin'
type Person={nombre?:string|null}
type Row={id:string;numero?:number|null;estado:string;descripcion?:string|null;tarifa?:number|string|null;created_at?:string|null;updated_at?:string|null;programado_para?:string|null;cliente_id?:string|null;proveedor_id?:string|null;categoria?:{nombre?:string|null;emoji?:string|null}|null;cliente?:Person|null;proveedor?:Person|null}
type ClientFilter='todos'|'curso'|'proximos'|'finalizados'
type GenericFilter='todos'|'completado'|'activo'|'cancelado'
type Props={role:Role;embedded?:boolean;openRequest?:boolean;onOpenService?:(serviceId:string)=>void}
type ClientStateCopy={title:string;detail:string;tone:'waiting'|'live'|'done'|'alert'}

const LABELS:Record<string,string>={borrador:'En preparación',buscando:'Buscando proveedor',ofrecido:'Oferta enviada',asignado:'Asignado',en_camino:'En camino',llegado:'Proveedor llegó',en_progreso:'En curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado',disputado:'En disputa'}
const CLIENT_STATE_COPY:Record<string,ClientStateCopy>={
 borrador:{title:'Pedido en preparación',detail:'Todavía no empezó la búsqueda de un profesional.',tone:'waiting'},
 buscando:{title:'Buscando profesional',detail:'UGO está buscando opciones para este pedido.',tone:'waiting'},
 ofrecido:{title:'Esperando respuesta',detail:'La propuesta ya fue enviada a profesionales disponibles.',tone:'waiting'},
 asignado:{title:'Profesional asignado',detail:'Ya hay un profesional para este pedido. Revisá los próximos pasos.',tone:'live'},
 en_camino:{title:'Profesional en camino',detail:'Seguí el traslado y usá el chat desde Abrir pedido.',tone:'live'},
 llegado:{title:'El profesional llegó',detail:'El profesional ya está en el lugar del servicio.',tone:'live'},
 en_progreso:{title:'Servicio en curso',detail:'El trabajo está siendo realizado ahora.',tone:'live'},
 esperando_aprobacion:{title:'Esperando tu aprobación',detail:'Revisá el cierre del trabajo antes de finalizar el pedido.',tone:'waiting'},
 completado:{title:'Servicio completado',detail:'El pedido terminó y quedó guardado en tu historial.',tone:'done'},
 cancelado:{title:'Pedido cancelado',detail:'Este pedido ya no está activo.',tone:'alert'},
 disputado:{title:'Pedido en revisión',detail:'UGO está siguiendo una incidencia de este servicio.',tone:'alert'}
}
const CLIENT_CANCELLABLE_STATES=new Set(['borrador','buscando','ofrecido','asignado','en_camino','llegado'])
const ACTIVE_STATES=new Set(['borrador','buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'])
const FINAL_STATES=new Set(['completado','cancelado'])
const money=(v:unknown)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const person=(p?:Person|null)=>p?.nombre||'—'
const date=(v?:string|null)=>v?new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—'
const isFuture=(row:Row)=>{if(!row.programado_para)return false;const value=new Date(row.programado_para).getTime();return Number.isFinite(value)&&value>Date.now()}
const isUpcoming=(row:Row)=>ACTIVE_STATES.has(row.estado)&&isFuture(row)
const isCurrent=(row:Row)=>ACTIVE_STATES.has(row.estado)&&!isUpcoming(row)
const isFinal=(row:Row)=>FINAL_STATES.has(row.estado)
const clientState=(estado:string)=>CLIENT_STATE_COPY[estado]||{title:LABELS[estado]||estado,detail:'Abrí el pedido para ver el estado completo.',tone:'waiting' as const}

export function ServiceHistoryPanel({role,embedded=false,openRequest=false,onOpenService}:Props){
 const sb=useMemo(()=>role==='admin'?adminSupabase:getRoleSupabase(role),[role])
 const[userId,setUserId]=useState<string|null>(null),[open,setOpen]=useState(embedded),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState<ClientFilter|GenericFilter>('todos'),[cancellingId,setCancellingId]=useState(''),[actionNotice,setActionNotice]=useState('')
 useEffect(()=>{let alive=true;sb.auth.getSession().then(({data})=>{if(alive)setUserId(data.session?.user?.id||null)});const{data:l}=sb.auth.onAuthStateChange((_e,s)=>setUserId(s?.user?.id||null));return()=>{alive=false;l.subscription.unsubscribe()}},[sb])
 useEffect(()=>{if(embedded)setOpen(true)},[embedded])
 useEffect(()=>{if(openRequest)setOpen(true)},[openRequest])
 const load=useCallback(async()=>{if(!userId)return;setLoading(true);setError('');try{let q=(sb as any).from('servicios').select('id,numero,estado,descripcion,tarifa,created_at,updated_at,programado_para,cliente_id,proveedor_id,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre),proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').order('created_at',{ascending:false}).limit(role==='admin'?200:80);if(role==='client')q=q.eq('cliente_id',userId);if(role==='provider')q=q.eq('proveedor_id',userId);const{data,error}=await q;if(error)throw error;setRows((data||[]) as Row[])}catch(e:any){setError(e?.message||'No se pudo cargar la actividad.')}finally{setLoading(false)}},[role,sb,userId])
 useEffect(()=>{if(open)load()},[open,load])
 useEffect(()=>{if(!userId)return;const realtimeFilter=role==='client'?`cliente_id=eq.${userId}`:role==='provider'?`proveedor_id=eq.${userId}`:undefined;const change={event:'*' as const,schema:'public' as const,table:'servicios' as const,...(realtimeFilter?{filter:realtimeFilter}:{})};const ch=(sb as any).channel(`ugo-history-${role}-${userId}`).on('postgres_changes',change,()=>{if(open)void load()}).subscribe();return()=>{sb.removeChannel(ch)}},[load,open,role,sb,userId])
 const cancelClientService=useCallback(async(serviceId:string)=>{if(role!=='client'||!userId||cancellingId)return;setCancellingId(serviceId);setActionNotice('');try{const{error}=await(sb as any).rpc('cancelar_servicio',{p_servicio_id:serviceId});if(error)throw error;setActionNotice('Solicitud cancelada correctamente.');await load()}catch(e:any){setActionNotice(e?.message||'No se pudo cancelar la solicitud. El pedido sigue activo y podés reintentar.')}finally{setCancellingId('')}},[cancellingId,load,role,sb,userId])
 if(!userId)return null
 const currentCount=rows.filter(isCurrent).length,upcomingCount=rows.filter(isUpcoming).length,finalCount=rows.filter(isFinal).length
 const visible=rows.filter(row=>{
  if(filter==='todos')return true
  if(role==='client'){
   if(filter==='curso')return isCurrent(row)
   if(filter==='proximos')return isUpcoming(row)
   if(filter==='finalizados')return isFinal(row)
  }
  if(filter==='completado')return row.estado==='completado'
  if(filter==='cancelado')return row.estado==='cancelado'
  if(filter==='activo')return ACTIVE_STATES.has(row.estado)
  return true
 })
 const title=role==='client'?'Actividad':role==='provider'?'Mis trabajos':'Historial global'
 const panel=<section className={`ugo-history-panel${embedded?' embedded':''}${role==='client'?' ugo-client-history':''}${role==='provider'?' ugo-provider-history':''}`} onClick={e=>e.stopPropagation()}>
   <header><div><small>{role==='admin'?'CONTROL UGO':role==='provider'?'PROVEEDOR':'CLIENTE'}</small><h2>{title}</h2><p>{role==='admin'?'Todos los pedidos y trabajos de UGO.':role==='provider'?'Trabajos aceptados y realizados por vos.':'Tus pedidos, separados por lo que está pasando ahora, lo que viene y lo que terminó.'}</p></div>{role==='client'&&<span className="ugo-client-history-total" aria-label={`${rows.length} pedidos`}>{rows.length}</span>}{!embedded&&<button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button>}</header>
   {role==='client'&&<div className="ugo-client-activity-summary" aria-label="Resumen de actividad">
    <button type="button" className={filter==='curso'?'active':''} onClick={()=>setFilter('curso')} aria-pressed={filter==='curso'}><span className="ugo-activity-summary-icon is-live">●</span><span><small>ACTIVOS AHORA</small><strong>{currentCount}</strong><em>{currentCount===1?'pedido requiere seguimiento':'pedidos requieren seguimiento'}</em></span></button>
    <button type="button" className={filter==='proximos'?'active':''} onClick={()=>setFilter('proximos')} aria-pressed={filter==='proximos'}><span className="ugo-activity-summary-icon is-waiting">◷</span><span><small>PRÓXIMOS</small><strong>{upcomingCount}</strong><em>{upcomingCount===1?'pedido programado':'pedidos programados'}</em></span></button>
    <button type="button" className={filter==='finalizados'?'active':''} onClick={()=>setFilter('finalizados')} aria-pressed={filter==='finalizados'}><span className="ugo-activity-summary-icon is-done">✓</span><span><small>FINALIZADOS</small><strong>{finalCount}</strong><em>historial y cancelados</em></span></button>
   </div>}
   <div className="ugo-history-filters">
    <button type="button" className={filter==='todos'?'active':''} onClick={()=>setFilter('todos')} aria-pressed={filter==='todos'}>Todos <b>{rows.length}</b></button>
    {role==='client'?<><button type="button" className={filter==='curso'?'active':''} onClick={()=>setFilter('curso')} aria-pressed={filter==='curso'}>En curso <b>{currentCount}</b></button><button type="button" className={filter==='proximos'?'active':''} onClick={()=>setFilter('proximos')} aria-pressed={filter==='proximos'}>Próximos <b>{upcomingCount}</b></button><button type="button" className={filter==='finalizados'?'active':''} onClick={()=>setFilter('finalizados')} aria-pressed={filter==='finalizados'}>Finalizados <b>{finalCount}</b></button></>:<><button type="button" className={filter==='activo'?'active':''} onClick={()=>setFilter('activo')}>Activos <b>{rows.filter(r=>ACTIVE_STATES.has(r.estado)).length}</b></button><button type="button" className={filter==='completado'?'active':''} onClick={()=>setFilter('completado')}>Completados <b>{rows.filter(r=>r.estado==='completado').length}</b></button>{role==='admin'&&<button type="button" className={filter==='cancelado'?'active':''} onClick={()=>setFilter('cancelado')}>Cancelados <b>{rows.filter(r=>r.estado==='cancelado').length}</b></button>}</>}
    <button type="button" className={role==='client'?'ugo-history-refresh':undefined} onClick={()=>void load()} disabled={loading} aria-label="Actualizar actividad">↻</button>
   </div>
   {actionNotice&&<div className="ugo-history-action-notice" role="status" aria-live="polite">{actionNotice}</div>}
   <div className="ugo-history-list">{loading&&<div className="ugo-history-empty">Cargando actividad…</div>}{error&&<div className="ugo-history-error">{error}</div>}{!loading&&!error&&visible.length===0&&<div className="ugo-history-empty">Todavía no hay movimientos en esta sección.</div>}{!loading&&!error&&visible.map(r=>{const state=clientState(r.estado);return <article key={r.id} className={role==='client'?`ugo-history-item state-${r.estado}`:undefined}>
    <div className="ugo-history-top"><div><small>PEDIDO</small><strong>#{r.numero??String(r.id).slice(0,8)}</strong></div><span className={`state-${r.estado}`}>{LABELS[r.estado]||r.estado}</span></div>
    <h3>{r.categoria?.emoji||'🧰'} {r.categoria?.nombre||'Servicio UGO'}</h3>
    {role==='client'&&<div className={`ugo-history-state-focus tone-${state.tone}`}><span className="ugo-history-state-dot">●</span><div><small>ESTADO DEL PEDIDO</small><strong>{state.title}</strong><p>{state.detail}</p></div></div>}
    {r.descripcion&&<p className="ugo-history-description">{r.descripcion}</p>}
    <div className="ugo-history-meta"><div><small>{r.programado_para?'PROGRAMADO':'CREADO'}</small><b>{date(r.programado_para||r.created_at)}</b></div><div><small>IMPORTE</small><b>{money(r.tarifa)}</b></div>{role!=='client'&&<div><small>CLIENTE</small><b>{person(r.cliente)}</b></div>}{role!=='provider'&&<div><small>PROVEEDOR</small><b>{person(r.proveedor)}</b></div>}</div>
    {role==='client'&&<div className="ugo-history-row-actions">{onOpenService&&<button type="button" className="ugo-history-open-button" onClick={()=>onOpenService(r.id)}>Abrir pedido y chat</button>}{CLIENT_CANCELLABLE_STATES.has(r.estado)&&<button type="button" className="ugo-history-cancel-button" disabled={Boolean(cancellingId)} onClick={()=>void cancelClientService(r.id)}>{cancellingId===r.id?'Cancelando…':'Cancelar pedido'}</button>}</div>}
   </article>})}</div>
  </section>
 if(embedded)return panel
 return <><button type="button" className={`ugo-history-launch ugo-history-${role}`} onClick={()=>setOpen(true)}>📚 <span>{role==='provider'?'Trabajos':role==='client'?'Actividad':'Historial'}</span></button>{open&&<div className={`ugo-history-backdrop ugo-history-backdrop-${role}`} onClick={()=>setOpen(false)}>{panel}</div>}</>
}
