import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{AdminHomeStitch}from'./AdminHomeStitch'
import{AdminUsersPanel}from'./AdminUsersPanel'
import{AdminProviderVerificationPanel}from'./AdminProviderVerificationPanel'
import{PixReconciliationPanel}from'./PixReconciliationPanel'
import{WhatsAppAdminInbox}from'./WhatsAppAdminInbox'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import{AdminServicesPro}from'./AdminServicesPro'
import{AdminAlertsDecisionCenter,AdminDisputesDecisionCenter}from'./AdminDecisionCenter'
import{AdminSystemSettings}from'./AdminSystemSettings'
import{AdminReportsCenter}from'./AdminReportsCenter'
import{AdminFinancePanel}from'./AdminFinancePanel'
import{SuperAdminCommandCenter}from'./SuperAdminCommandCenter'
import{
 AdminOverviewNative,AdminMapNative,AdminScoutNative,
 AdminDocumentsNative,AdminKycNative,AdminImportNative,AdminTariffsNative,
 AdminCategoriesNative,AdminNotificationsNative
}from'./AdminNativeModules'
import'./admin-phase2.css'
import'./admin-operations-menu.css'

type Section='home'|'operations'|'people'|'finance'|'settings'|'superadmin'
type OperationView='overview'|'map'|'services'|'alerts'|'disputes'|'scout'|'history'|'messages'
type PeopleView='users'|'providers'|'verification'|'documents'|'kyc'|'import'
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
  const db=supabase as any,today=new Date();today.setHours(0,0,0,0)
  const activeStates=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
  const[{count:active},{count:online},{count:users},{count:pendingProviders},{count:pendingPix},{count:completedToday}]=await Promise.all([
   db.from('servicios').select('id',{count:'exact',head:true}).eq('ambiente','real').in('estado',activeStates),
   db.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).eq('online',true).eq('disponible',true),
   db.from('usuarios').select('id',{count:'exact',head:true}).eq('activo',true),
   db.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).in('estado_verificacion',['registrado','pendiente']),
   db.from('pagos').select('id',{count:'exact',head:true}).eq('ambiente','real').eq('metodo','pix_direto').eq('estado','pendiente').not('pix_informado_at','is',null),
   db.from('servicios').select('id',{count:'exact',head:true}).eq('ambiente','real').eq('estado','completado').gte('completado_at',today.toISOString()),
  ])
  setMetrics({active:active||0,online:online||0,users:users||0,pendingProviders:pendingProviders||0,pendingPix:pendingPix||0,completedToday:completedToday||0})
  setUpdated(new Date());setLoading(false)
 },[])
 useEffect(()=>{load().catch(()=>setLoading(false));const ch=supabase.channel('ugo-admin-phase2').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},load).on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},load).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},load).subscribe();return()=>{supabase.removeChannel(ch)}},[load])
 const title=useMemo(()=>({home:'Inicio',operations:'Operaciones',people:'Personas',finance:'Finanzas',settings:'Configuración',superadmin:'Super Admin'}[section]),[section])
 const opMeta:Record<OperationView,{eyebrow:string;title:string}>={overview:{eyebrow:'RESUMEN OPERATIVO',title:'Estado general de la operación'},map:{eyebrow:'MAPA EN VIVO',title:'Proveedores y servicios sobre el territorio'},services:{eyebrow:'SERVICIOS',title:'Pedidos y trabajos activos'},alerts:{eyebrow:'ALERTAS',title:'Eventos que requieren atención'},disputes:{eyebrow:'DISPUTAS',title:'Conflictos y resoluciones'},scout:{eyebrow:'SCOUT UGO',title:'Prospección y detección de oportunidades'},history:{eyebrow:'HISTORIAL',title:'Trazabilidad completa de UGO'},messages:{eyebrow:'MENSAJES',title:'WhatsApp y atención operativa'}}
 const openPeople=(view:PeopleView)=>{setSection('people');setPeopleView(view)}
 const openFinance=(view:FinanceView)=>{setSection('finance');setFinanceView(view)}
 const nativeWrap=(node:React.ReactNode)=><div className="ugo-admin2-native-module">{node}</div>
 return <div className={`ugo-admin2${section==='home'?' ugo-admin-stitch':''}`}>
  <aside className="ugo-admin2-sidebar"><div className="ugo-admin2-brand"><span>U.GO</span><small>CONTROL CENTER</small></div><nav>
   <button className={section==='home'?'active':''} onClick={()=>setSection('home')}><b>⌂</b><span>Inicio</span></button>
   <button className={section==='operations'?'active':''} onClick={()=>setSection('operations')}><b>◎</b><span>Operaciones</span>{metrics.active>0&&<em>{metrics.active}</em>}</button>
   <button className={section==='people'?'active':''} onClick={()=>setSection('people')}><b>♙</b><span>Personas</span>{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button>
   <button className={section==='finance'?'active':''} onClick={()=>setSection('finance')}><b>◫</b><span>Finanzas</span>{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button>
   <button className={section==='settings'?'active':''} onClick={()=>setSection('settings')}><b>⚙</b><span>Configuración</span></button>
   <button className={section==='superadmin'?'active':''} onClick={()=>setSection('superadmin')}><b>◉</b><span>Super Admin</span></button>
  </nav><div className="ugo-admin2-status"><i/>Sistema operativo<small>{updated?`Actualizado ${updated.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:'Sincronizando…'}</small></div></aside>
  <main className="ugo-admin2-main"><header><div><small>UGO · ADMIN</small><h1>{title}</h1></div><button className="ugo-admin2-refresh" onClick={()=>load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></header>
   {section==='home'&&<AdminHomeStitch metrics={metrics} loading={loading} onOpenServices={()=>{setSection('operations');setOperationView('services')}} onOpenVerification={()=>openPeople('verification')} onOpenPix={()=>openFinance('pix')}/>}
   {section==='operations'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>OPERACIONES</small><h2>Control operativo UGO</h2></div><span>{metrics.active} reales activos</span></div><div className="ugo-admin2-operations-menu" role="tablist" aria-label="Menú de operaciones">
    <button className={operationView==='overview'?'active':''} onClick={()=>setOperationView('overview')}><b>◈</b><span>Resumen</span><small>Estado general</small></button><button className={operationView==='map'?'active':''} onClick={()=>setOperationView('map')}><b>🗺</b><span>Mapa</span><small>Operación en vivo</small></button><button className={operationView==='services'?'active':''} onClick={()=>setOperationView('services')}><b>⊞</b><span>Servicios</span><small>Pedidos activos</small>{metrics.active>0&&<em>{metrics.active}</em>}</button><button className={operationView==='alerts'?'active':''} onClick={()=>setOperationView('alerts')}><b>△</b><span>Alertas</span><small>Atención operativa</small></button><button className={operationView==='disputes'?'active':''} onClick={()=>setOperationView('disputes')}><b>⊘</b><span>Disputas</span><small>Casos abiertos</small></button><button className={operationView==='scout'?'active':''} onClick={()=>setOperationView('scout')}><b>📡</b><span>Scout</span><small>Oportunidades</small></button><button className={operationView==='history'?'active':''} onClick={()=>setOperationView('history')}><b>▤</b><span>Historial</span><small>Trazabilidad</small></button><button className={operationView==='messages'?'active':''} onClick={()=>setOperationView('messages')}><b>◌</b><span>Mensajes</span><small>WhatsApp</small></button>
   </div><div className="ugo-admin2-operation-context"><small>{opMeta[operationView].eyebrow}</small><strong>{opMeta[operationView].title}</strong></div>
   {operationView==='overview'&&nativeWrap(<AdminOverviewNative/>)}{operationView==='map'&&nativeWrap(<AdminMapNative/>)}{operationView==='services'&&nativeWrap(<AdminServicesPro/>)}{operationView==='alerts'&&nativeWrap(<AdminAlertsDecisionCenter/>)}{operationView==='disputes'&&nativeWrap(<AdminDisputesDecisionCenter/>)}{operationView==='scout'&&nativeWrap(<AdminScoutNative/>)}{operationView==='history'&&<div className="ugo-admin2-history"><ServiceHistoryPanel role="admin" embedded/></div>}{operationView==='messages'&&<div className="ugo-admin2-inline-tool ugo-admin2-messages"><WhatsAppAdminInbox/></div>}</section>}
   {section==='people'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>PERSONAS</small><h2>Clientes y proveedores</h2></div><span>{metrics.pendingProviders} verificaciones pendientes</span></div><div className="ugo-admin2-submenu"><button className={peopleView==='users'?'active':''} onClick={()=>setPeopleView('users')}>Usuarios</button><button className={peopleView==='verification'?'active':''} onClick={()=>setPeopleView('verification')}>Verificación{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button><button className={peopleView==='documents'?'active':''} onClick={()=>setPeopleView('documents')}>Documentos</button><button className={peopleView==='kyc'?'active':''} onClick={()=>setPeopleView('kyc')}>KYC</button><button className={peopleView==='import'?'active':''} onClick={()=>setPeopleView('import')}>Importar</button></div>{peopleView==='users'&&<div className="ugo-admin2-module-card"><AdminUsersPanel/></div>}{peopleView==='verification'&&<div className="ugo-admin2-module-card"><AdminProviderVerificationPanel/></div>}{peopleView==='documents'&&nativeWrap(<AdminDocumentsNative/>)}{peopleView==='kyc'&&nativeWrap(<AdminKycNative/>)}{peopleView==='import'&&nativeWrap(<AdminImportNative/>)}</section>}
   {section==='finance'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>FINANZAS · REAL</small><h2>Pagos, bóveda y tarifas</h2></div><span>{metrics.pendingPix} PIX reales pendientes</span></div><div className="ugo-admin2-submenu"><button className={financeView==='pix'?'active':''} onClick={()=>setFinanceView('pix')}>PIX{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button><button className={financeView==='vault'?'active':''} onClick={()=>setFinanceView('vault')}>Bóveda y retiros</button><button className={financeView==='tariffs'?'active':''} onClick={()=>setFinanceView('tariffs')}>Tarifas</button></div>{financeView==='pix'&&<div className="ugo-admin2-module-card"><PixReconciliationPanel/></div>}{financeView==='vault'&&nativeWrap(<AdminFinancePanel embedded/>)}{financeView==='tariffs'&&nativeWrap(<AdminTariffsNative/>)}</section>}
   {section==='settings'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>CONFIGURACIÓN</small><h2>Sistema UGO</h2></div></div><div className="ugo-admin2-submenu"><button className={settingsView==='categories'?'active':''} onClick={()=>setSettingsView('categories')}>Categorías</button><button className={settingsView==='analytics'?'active':''} onClick={()=>setSettingsView('analytics')}>Analytics</button><button className={settingsView==='notifications'?'active':''} onClick={()=>setSettingsView('notifications')}>Notificaciones</button><button className={settingsView==='reports'?'active':''} onClick={()=>setSettingsView('reports')}>Reportes</button><button className={settingsView==='system'?'active':''} onClick={()=>setSettingsView('system')}>Sistema</button></div>{settingsView==='categories'&&nativeWrap(<AdminCategoriesNative/>)}{settingsView==='analytics'&&nativeWrap(<AdminReportsCenter/>)}{settingsView==='notifications'&&nativeWrap(<AdminNotificationsNative/>)}{settingsView==='reports'&&nativeWrap(<AdminReportsCenter/>)}{settingsView==='system'&&nativeWrap(<AdminSystemSettings/>)}</section>}
   {section==='superadmin'&&<section className="ugo-admin2-section"><SuperAdminCommandCenter/></section>}
  </main>
 </div>
}
