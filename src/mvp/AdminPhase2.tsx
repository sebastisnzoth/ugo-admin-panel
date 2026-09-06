import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{AdminPanelBridge}from'./AdminPanelBridge'
import{AdminUsersPanel}from'./AdminUsersPanel'
import{AdminProviderVerificationPanel}from'./AdminProviderVerificationPanel'
import{PixReconciliationPanel}from'./PixReconciliationPanel'
import{WhatsAppAdminInbox}from'./WhatsAppAdminInbox'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import'./admin-phase2.css'
import'./admin-operations-menu.css'

type Section='home'|'operations'|'people'|'finance'|'settings'
type OperationView='overview'|'map'|'services'|'alerts'|'disputes'|'scout'|'history'|'messages'
type PeopleView='users'|'verification'|'documents'|'kyc'|'import'
type FinanceView='pix'|'vault'|'tariffs'
type SettingsView='categories'|'analytics'|'notifications'|'reports'|'system'
type Metrics={active:number;online:number;users:number;pendingProviders:number;pendingPix:number;completedToday:number}
const empty:Metrics={active:0,online:0,users:0,pendingProviders:0,pendingPix:0,completedToday:0}

export function AdminPhase2(){
 const[section,setSection]=useState<Section>('home')
 const[operationView,setOperationView]=useState<OperationView>('overview')
 const[peopleView,setPeopleView]=useState<PeopleView>('users')
 const[financeView,setFinanceView]=useState<FinanceView>('pix')
 const[settingsView,setSettingsView]=useState<SettingsView>('categories')
 const[metrics,setMetrics]=useState<Metrics>(empty),[loading,setLoading]=useState(true),[updated,setUpdated]=useState<Date|null>(null)
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
 const critical=metrics.pendingProviders+metrics.pendingPix
 const opMeta:Record<OperationView,{eyebrow:string;title:string}>={
  overview:{eyebrow:'RESUMEN OPERATIVO',title:'Estado general de la operación'},map:{eyebrow:'MAPA EN VIVO',title:'Proveedores y servicios sobre el territorio'},services:{eyebrow:'SERVICIOS',title:'Pedidos y trabajos activos'},alerts:{eyebrow:'ALERTAS',title:'Eventos que requieren atención'},disputes:{eyebrow:'DISPUTAS',title:'Conflictos y resoluciones'},scout:{eyebrow:'SCOUT UGO',title:'Prospección y detección de oportunidades'},history:{eyebrow:'HISTORIAL',title:'Trazabilidad completa de UGO'},messages:{eyebrow:'MENSAJES',title:'WhatsApp y atención operativa'},
 }
 const openPeople=(view:PeopleView)=>{setSection('people');setPeopleView(view)}
 const openFinance=(view:FinanceView)=>{setSection('finance');setFinanceView(view)}
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
    <section className={`ugo-admin2-health ${critical?'attention':'ok'}`}><div><small>ESTADO OPERATIVO</small><strong>{critical?'Hay tareas pendientes':'UGO está operativo'}</strong><p>{critical?`${critical} control${critical===1?'':'es'} requieren atención administrativa.`:'Sin alertas administrativas pendientes.'}</p></div><span>{critical?critical:'✓'}</span></section>
    <section className="ugo-admin2-kpis">
     <article><small>SERVICIOS ACTIVOS</small><strong>{metrics.active}</strong><span>En curso ahora</span></article>
     <article><small>PROVEEDORES ONLINE</small><strong>{metrics.online}</strong><span>Disponibles para matching</span></article>
     <article><small>USUARIOS ACTIVOS</small><strong>{metrics.users}</strong><span>Clientes, proveedores y admin</span></article>
     <article><small>COMPLETADOS HOY</small><strong>{metrics.completedToday}</strong><span>Servicios cerrados</span></article>
    </section>
    <section className="ugo-admin2-priority">
     <div><small>PRIORIDADES</small><h2>Qué necesita atención</h2></div>
     <button onClick={()=>openPeople('verification')}><span>Verificación de proveedores</span><strong>{metrics.pendingProviders}</strong><small>Pendientes de revisión</small></button>
     <button onClick={()=>openFinance('pix')}><span>Conciliaciones PIX</span><strong>{metrics.pendingPix}</strong><small>Pagos esperando control</small></button>
     <button onClick={()=>{setSection('operations');setOperationView('services')}}><span>Servicios activos</span><strong>{metrics.active}</strong><small>Ver operación actual</small></button>
    </section>
    <section className="ugo-admin2-flow"><small>FLUJO UGO</small><h2>Cliente → Matching → Proveedor → Pago → Servicio → Cierre</h2><p>El panel está organizado alrededor de este flujo. Cada alerta y cada métrica corresponde a una etapa operativa real.</p></section>
   </div>}
   {section==='operations'&&<section className="ugo-admin2-section">
    <div className="ugo-admin2-section-head"><div><small>OPERACIONES</small><h2>Control operativo UGO</h2></div><span>{metrics.active} activos</span></div>
    <div className="ugo-admin2-operations-menu" role="tablist" aria-label="Menú de operaciones">
     <button role="tab" aria-selected={operationView==='overview'} className={operationView==='overview'?'active':''} onClick={()=>setOperationView('overview')}><b>◈</b><span>Resumen</span><small>Estado general</small></button>
     <button role="tab" aria-selected={operationView==='map'} className={operationView==='map'?'active':''} onClick={()=>setOperationView('map')}><b>🗺</b><span>Mapa</span><small>Operación en vivo</small></button>
     <button role="tab" aria-selected={operationView==='services'} className={operationView==='services'?'active':''} onClick={()=>setOperationView('services')}><b>⊞</b><span>Servicios</span><small>Pedidos activos</small>{metrics.active>0&&<em>{metrics.active}</em>}</button>
     <button role="tab" aria-selected={operationView==='alerts'} className={operationView==='alerts'?'active':''} onClick={()=>setOperationView('alerts')}><b>△</b><span>Alertas</span><small>Atención operativa</small></button>
     <button role="tab" aria-selected={operationView==='disputes'} className={operationView==='disputes'?'active':''} onClick={()=>setOperationView('disputes')}><b>⊘</b><span>Disputas</span><small>Casos abiertos</small></button>
     <button role="tab" aria-selected={operationView==='scout'} className={operationView==='scout'?'active':''} onClick={()=>setOperationView('scout')}><b>📡</b><span>Scout</span><small>Oportunidades y cobertura</small></button>
     <button role="tab" aria-selected={operationView==='history'} className={operationView==='history'?'active':''} onClick={()=>setOperationView('history')}><b>▤</b><span>Historial</span><small>Trazabilidad</small></button>
     <button role="tab" aria-selected={operationView==='messages'} className={operationView==='messages'?'active':''} onClick={()=>setOperationView('messages')}><b>◌</b><span>Mensajes</span><small>WhatsApp</small></button>
    </div>
    <div className="ugo-admin2-operation-context"><small>{opMeta[operationView].eyebrow}</small><strong>{opMeta[operationView].title}</strong></div>
    {operationView==='overview'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="dashboard" embedded/></div>}
    {operationView==='map'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="mapa_ops" embedded/></div>}
    {operationView==='services'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="servicios" embedded/></div>}
    {operationView==='alerts'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="alertas" embedded/></div>}
    {operationView==='disputes'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="disputas" embedded/></div>}
    {operationView==='scout'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="scout" embedded/></div>}
    {operationView==='history'&&<div className="ugo-admin2-history"><ServiceHistoryPanel role="admin" embedded/></div>}
    {operationView==='messages'&&<div className="ugo-admin2-inline-tool ugo-admin2-messages"><WhatsAppAdminInbox/></div>}
   </section>}
   {section==='people'&&<section className="ugo-admin2-section">
    <div className="ugo-admin2-section-head"><div><small>PERSONAS</small><h2>Clientes y proveedores</h2></div><span>{metrics.pendingProviders} verificaciones pendientes</span></div>
    <div className="ugo-admin2-submenu" role="tablist" aria-label="Menú de personas">
     <button className={peopleView==='users'?'active':''} onClick={()=>setPeopleView('users')}>Usuarios</button>
     <button className={peopleView==='verification'?'active':''} onClick={()=>setPeopleView('verification')}>Verificación{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button>
     <button className={peopleView==='documents'?'active':''} onClick={()=>setPeopleView('documents')}>Documentos</button>
     <button className={peopleView==='kyc'?'active':''} onClick={()=>setPeopleView('kyc')}>KYC</button>
     <button className={peopleView==='import'?'active':''} onClick={()=>setPeopleView('import')}>Importar</button>
    </div>
    {peopleView==='users'&&<div className="ugo-admin2-module-card"><AdminUsersPanel/></div>}
    {peopleView==='verification'&&<div className="ugo-admin2-module-card"><AdminProviderVerificationPanel/></div>}
    {peopleView==='documents'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="documentos" embedded/></div>}
    {peopleView==='kyc'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="validacion_paises" embedded/></div>}
    {peopleView==='import'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="import_provs" embedded/></div>}
   </section>}
   {section==='finance'&&<section className="ugo-admin2-section">
    <div className="ugo-admin2-section-head"><div><small>FINANZAS</small><h2>Pagos, bóveda y tarifas</h2></div><span>{metrics.pendingPix} PIX pendientes</span></div>
    <div className="ugo-admin2-submenu" role="tablist" aria-label="Menú de finanzas">
     <button className={financeView==='pix'?'active':''} onClick={()=>setFinanceView('pix')}>PIX{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button>
     <button className={financeView==='vault'?'active':''} onClick={()=>setFinanceView('vault')}>Bóveda y retiros</button>
     <button className={financeView==='tariffs'?'active':''} onClick={()=>setFinanceView('tariffs')}>Tarifas</button>
    </div>
    {financeView==='pix'&&<div className="ugo-admin2-module-card"><PixReconciliationPanel/></div>}
    {financeView==='vault'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="finanzas" embedded/></div>}
    {financeView==='tariffs'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="tarifas" embedded/></div>}
   </section>}
   {section==='settings'&&<section className="ugo-admin2-section">
    <div className="ugo-admin2-section-head"><div><small>CONFIGURACIÓN</small><h2>Sistema UGO</h2></div></div>
    <div className="ugo-admin2-submenu" role="tablist" aria-label="Menú de configuración">
     <button className={settingsView==='categories'?'active':''} onClick={()=>setSettingsView('categories')}>Categorías</button>
     <button className={settingsView==='analytics'?'active':''} onClick={()=>setSettingsView('analytics')}>Analytics</button>
     <button className={settingsView==='notifications'?'active':''} onClick={()=>setSettingsView('notifications')}>Notificaciones</button>
     <button className={settingsView==='reports'?'active':''} onClick={()=>setSettingsView('reports')}>Reportes</button>
     <button className={settingsView==='system'?'active':''} onClick={()=>setSettingsView('system')}>Sistema</button>
    </div>
    {settingsView==='categories'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="categorias" embedded/></div>}
    {settingsView==='analytics'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="analytics" embedded/></div>}
    {settingsView==='notifications'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="notificaciones" embedded/></div>}
    {settingsView==='reports'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="reportes" embedded/></div>}
    {settingsView==='system'&&<div className="ugo-admin2-operation-module"><AdminPanelBridge section="config" embedded/></div>}
   </section>}
  </main>
 </div>
}
