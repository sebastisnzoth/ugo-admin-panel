import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{AdminPanelBridge}from'./AdminPanelBridge'
import{AdminUsersPanel}from'./AdminUsersPanel'
import{AdminProviderVerificationPanel}from'./AdminProviderVerificationPanel'
import{PixReconciliationPanel}from'./PixReconciliationPanel'
import{WhatsAppAdminInbox}from'./WhatsAppAdminInbox'
import'./admin-phase2.css'

type Section='home'|'operations'|'people'|'finance'|'settings'
type Metrics={active:number;online:number;users:number;pendingProviders:number;pendingPix:number;completedToday:number}
const empty:Metrics={active:0,online:0,users:0,pendingProviders:0,pendingPix:0,completedToday:0}

export function AdminPhase2(){
 const[section,setSection]=useState<Section>('home'),[metrics,setMetrics]=useState<Metrics>(empty),[loading,setLoading]=useState(true),[updated,setUpdated]=useState<Date|null>(null)
 const load=useCallback(async()=>{
  setLoading(true)
  const today=new Date();today.setHours(0,0,0,0)
  const activeStates=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
  const[{count:active},{count:online},{count:users},{count:pendingProviders},{count:pendingPix},{count:completedToday}]=await Promise.all([
   supabase.from('servicios').select('id',{count:'exact',head:true}).in('estado',activeStates),
   supabase.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).eq('online',true).eq('disponible',true),
   supabase.from('usuarios').select('id',{count:'exact',head:true}).eq('activo',true),
   supabase.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).in('estado_verificacion',['registrado','pendiente']),
   supabase.from('pagos').select('id',{count:'exact',head:true}).eq('metodo','pix_direto').eq('estado','pendiente').not('pix_informado_at','is',null),
   supabase.from('servicios').select('id',{count:'exact',head:true}).eq('estado','completado').gte('completado_at',today.toISOString()),
  ])
  setMetrics({active:active||0,online:online||0,users:users||0,pendingProviders:pendingProviders||0,pendingPix:pendingPix||0,completedToday:completedToday||0})
  setUpdated(new Date());setLoading(false)
 },[])
 useEffect(()=>{load().catch(()=>setLoading(false));const ch=supabase.channel('ugo-admin-phase2').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},load).on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},load).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},load).subscribe();return()=>{supabase.removeChannel(ch)}},[load])
 const title=useMemo(()=>({home:'Inicio',operations:'Operaciones',people:'Personas',finance:'Finanzas',settings:'Configuración'}[section]),[section])
 return <div className="ugo-admin2">
  <aside className="ugo-admin2-sidebar">
   <div className="ugo-admin2-brand"><span>U.GO</span><small>CONTROL CENTER</small></div>
   <nav>
    <button className={section==='home'?'active':''} onClick={()=>setSection('home')}><b>⌂</b><span>Inicio</span></button>
    <button className={section==='operations'?'active':''} onClick={()=>setSection('operations')}><b>◎</b><span>Operaciones</span>{metrics.active>0&&<em>{metrics.active}</em>}</button>
    <button className={section==='people'?'active':''} onClick={()=>setSection('people')}><b>♙</b><span>Personas</span>{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button>
    <button className={section==='finance'?'active':''} onClick={()=>setSection('finance')}><b>◫</b><span>Finanzas</span>{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button>
    <button className={section==='settings'?'active':''} onClick={()=>setSection('settings')}><b>⚙</b><span>Configuración</span></button>
   </nav>
   <div className="ugo-admin2-status"><i/>Sistema operativo<small>{updated?`Actualizado ${updated.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:'Sincronizando…'}</small></div>
  </aside>
  <main className="ugo-admin2-main">
   <header><div><small>UGO · ADMIN</small><h1>{title}</h1></div><button className="ugo-admin2-refresh" onClick={()=>load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></header>
   {section==='home'&&<div className="ugo-admin2-home">
    <section className="ugo-admin2-kpis">
     <article><small>SERVICIOS ACTIVOS</small><strong>{metrics.active}</strong><span>En curso ahora</span></article>
     <article><small>PROVEEDORES ONLINE</small><strong>{metrics.online}</strong><span>Disponibles para matching</span></article>
     <article><small>USUARIOS ACTIVOS</small><strong>{metrics.users}</strong><span>Clientes, proveedores y admin</span></article>
     <article><small>COMPLETADOS HOY</small><strong>{metrics.completedToday}</strong><span>Servicios cerrados</span></article>
    </section>
    <section className="ugo-admin2-priority">
     <div><small>PRIORIDADES</small><h2>Qué necesita atención</h2></div>
     <button onClick={()=>setSection('people')}><span>Verificación de proveedores</span><strong>{metrics.pendingProviders}</strong><small>Pendientes de revisión</small></button>
     <button onClick={()=>setSection('finance')}><span>Conciliaciones PIX</span><strong>{metrics.pendingPix}</strong><small>Pagos esperando control</small></button>
     <button onClick={()=>setSection('operations')}><span>Operación en vivo</span><strong>{metrics.active}</strong><small>Servicios activos ahora</small></button>
    </section>
    <section className="ugo-admin2-flow"><small>FLUJO UGO</small><h2>Cliente → Matching → Proveedor → Pago → Servicio → Cierre</h2><p>El panel está organizado alrededor de este flujo. Cada alerta y cada métrica debe corresponder a una etapa operativa real.</p></section>
   </div>}
   {section==='operations'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>OPERACIÓN EN VIVO</small><h2>Servicios, mapa y estados</h2></div><span>{metrics.active} activos</span></div><div className="ugo-admin2-legacy"><AdminPanelBridge/></div><div className="ugo-admin2-inline-tool"><WhatsAppAdminInbox/></div></section>}
   {section==='people'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>PERSONAS</small><h2>Clientes y proveedores</h2></div><span>{metrics.pendingProviders} verificaciones pendientes</span></div><p className="ugo-admin2-help">Gestioná altas, actividad, reputación y verificación desde una sola sección.</p><div className="ugo-admin2-inline-tool"><AdminProviderVerificationPanel/><AdminUsersPanel/></div></section>}
   {section==='finance'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>FINANZAS</small><h2>Pagos y conciliación</h2></div><span>{metrics.pendingPix} PIX pendientes</span></div><p className="ugo-admin2-help">Controlá pagos protegidos, conciliaciones y liberaciones relacionadas con servicios reales.</p><div className="ugo-admin2-inline-tool"><PixReconciliationPanel/></div></section>}
   {section==='settings'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>CONFIGURACIÓN</small><h2>Sistema UGO</h2></div></div><div className="ugo-admin2-settings-grid"><article><small>MODELO OPERATIVO</small><strong>Cliente / Proveedor / Admin</strong><p>Tres experiencias conectadas a la misma operación y fuente de datos.</p></article><article><small>ASISTENTE</small><strong>Hugo</strong><p>Asistencia contextual para Cliente y Proveedor, basada en información real de UGO.</p></article><article><small>ESTADO</small><strong>Producción</strong><p>Configuración sensible y herramientas técnicas permanecen fuera del flujo diario.</p></article></div></section>}
  </main>
 </div>
}
