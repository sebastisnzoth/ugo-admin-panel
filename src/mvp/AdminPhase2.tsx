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
import{ConversationalOrb}from'../components/ConversationalOrb'
import{
 AdminOverviewNative,AdminMapNative,AdminScoutNative,
 AdminDocumentsNative,AdminKycNative,AdminImportNative,AdminTariffsNative,
 AdminCategoriesNative,AdminNotificationsNative
}from'./AdminNativeModules'
import'./admin-phase2.css'
import'./admin-operations-menu.css'
import'./admin-uiux-final.css'

type Section='home'|'operations'|'people'|'finance'|'settings'|'superadmin'
type OperationView='overview'|'map'|'services'|'alerts'|'disputes'|'scout'|'history'|'messages'
type PeopleView='users'|'providers'|'verification'|'documents'|'kyc'|'import'
type FinanceView='pix'|'vault'|'tariffs'
type SettingsView='categories'|'analytics'|'notifications'|'reports'|'system'
type AdminRole='admin'|'superadmin'
type HugoUiAction={type:'navigate'|'open_service'|'refresh'|'map_filter';target?:string;service_id?:string;service_number?:number;status?:string;category?:string|null;zone?:string|null;place?:string|null;radius_m?:number|null;show_providers?:boolean|null;show_clients?:boolean|null}
type Metrics={active:number;online:number;users:number;pendingProviders:number;pendingPix:number;completedToday:number}
type GmailStatus={configured:boolean;connected:boolean;email:string|null;updatedAt:string|null}
const empty:Metrics={active:0,online:0,users:0,pendingProviders:0,pendingPix:0,completedToday:0}

export function AdminPhase2(){
 const[section,setSection]=useState<Section>('home')
 const[operationView,setOperationView]=useState<OperationView>('overview')
 const[peopleView,setPeopleView]=useState<PeopleView>('users')
 const[financeView,setFinanceView]=useState<FinanceView>('pix')
 const[settingsView,setSettingsView]=useState<SettingsView>('categories')
 const[selectedServiceId,setSelectedServiceId]=useState<string|null>(null)
 const[hugoVoiceActive,setHugoVoiceActive]=useState(false)
 const[adminRole,setAdminRole]=useState<AdminRole|null>(null),[roleError,setRoleError]=useState('')
 const[metrics,setMetrics]=useState<Metrics>(empty),[loading,setLoading]=useState(true),[updated,setUpdated]=useState<Date|null>(null),[metricsError,setMetricsError]=useState(''),[liveStatus,setLiveStatus]=useState<'connecting'|'live'|'degraded'>('connecting'),[channelEpoch,setChannelEpoch]=useState(0)
 const[gmail,setGmail]=useState<GmailStatus>({configured:false,connected:false,email:null,updatedAt:null}),[gmailBusy,setGmailBusy]=useState(false),[gmailMessage,setGmailMessage]=useState('')
 const isSuperAdmin=adminRole==='superadmin'
 useEffect(()=>{let active=true;(async()=>{try{const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw userError||new Error('Sesión Admin requerida.');const adminDb=supabase as any;const{data,error}=await adminDb.from('usuarios').select('tipo,activo').eq('id',user.id).maybeSingle();if(error)throw error;const role=String(data?.tipo||'');if(!data?.activo||!['admin','superadmin'].includes(role))throw new Error('Acceso administrativo no autorizado.');if(active)setAdminRole(role as AdminRole)}catch(error){if(active){setAdminRole(null);setRoleError(error instanceof Error?error.message:'No pudimos validar el rol administrativo.')}}})();return()=>{active=false}},[])
 useEffect(()=>{if(section==='superadmin'&&adminRole&&!isSuperAdmin)setSection('home')},[section,adminRole,isSuperAdmin])
 const load=useCallback(async(options?:{silent?:boolean})=>{
  if(!options?.silent)setLoading(true);setMetricsError('')
  const db=supabase as any,today=new Date();today.setHours(0,0,0,0)
  const activeStates=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
  try{
   const results=await Promise.all([
    db.from('servicios').select('id',{count:'exact',head:true}).eq('ambiente','real').in('estado',activeStates),
    db.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).eq('online',true).eq('disponible',true),
    db.from('usuarios').select('id',{count:'exact',head:true}).eq('activo',true),
    db.from('perfiles_proveedor').select('usuario_id',{count:'exact',head:true}).in('estado_verificacion',['registrado','pendiente']),
    db.from('pagos').select('id',{count:'exact',head:true}).eq('ambiente','real').eq('metodo','pix_direto').eq('estado','pendiente').not('pix_informado_at','is',null),
    db.from('servicios').select('id',{count:'exact',head:true}).eq('ambiente','real').eq('estado','completado').gte('completado_at',today.toISOString()),
   ])
   const failed=results.find(result=>result?.error)
   if(failed?.error)throw failed.error
   const[{count:active},{count:online},{count:users},{count:pendingProviders},{count:pendingPix},{count:completedToday}]=results
   setMetrics({active:active??0,online:online??0,users:users??0,pendingProviders:pendingProviders??0,pendingPix:pendingPix??0,completedToday:completedToday??0})
   setUpdated(new Date())
  }catch(error){
   console.warn('UGO Admin metrics unavailable',error)
   setMetricsError('No pudimos actualizar los indicadores. Conservamos los últimos datos válidos para no mostrar ceros falsos.')
  }finally{if(!options?.silent)setLoading(false)}
 },[])
 useEffect(()=>{
  let alive=true
  const sync=()=>{if(alive)void load({silent:true})}
  const onOnline=()=>{setLiveStatus('connecting');sync()}
  const onVisibility=()=>{if(document.visibilityState==='visible')sync()}
  window.addEventListener('online',onOnline)
  document.addEventListener('visibilitychange',onVisibility)
  void load()
  const ch=supabase.channel(`ugo-admin-phase2-${channelEpoch}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicios'},sync)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicio_estado_eventos'},sync)
   .on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},sync)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos'},sync)
   .on('postgres_changes',{event:'*',schema:'public',table:'usuarios'},sync)
   .on('postgres_changes',{event:'*',schema:'public',table:'deudas_ugo_proveedor'},sync)
   .subscribe(status=>{
    if(!alive)return
    if(status==='SUBSCRIBED'){setLiveStatus('live');sync();return}
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){setLiveStatus('degraded');window.setTimeout(()=>{if(alive)setChannelEpoch(v=>v+1)},1500)}
   })
  const fallback=window.setInterval(()=>{if(document.visibilityState==='visible')sync()},10000)
  return()=>{alive=false;window.clearInterval(fallback);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}
 },[channelEpoch,load])
 const adminToken=useCallback(async(force=false)=>{const result=force?await supabase.auth.refreshSession():await supabase.auth.getSession(),token=result.data.session?.access_token;if(result.error||!token)throw new Error('Sesión Admin vencida.');return token},[])
 const loadGmail=useCallback(async()=>{try{const token=await adminToken(),r=await fetch('/api/scout/gmail',{headers:{Authorization:`Bearer ${token}`}}),p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||'No se pudo consultar Gmail.');setGmail({configured:Boolean(p.configured),connected:Boolean(p.connected),email:p.email||null,updatedAt:p.updatedAt||null})}catch(error){setGmailMessage(error instanceof Error?error.message:'No se pudo consultar Gmail.')}},[adminToken])
 const gmailAction=useCallback(async(body:Record<string,unknown>)=>{const request=async(token:string)=>fetch('/api/scout/gmail',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});let r=await request(await adminToken());if(r.status===401)r=await request(await adminToken(true));const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||`Gmail respondió HTTP ${r.status}`);return p},[adminToken])
 const connectGmail=useCallback(async()=>{if(gmailBusy)return;if(gmail.connected){setSection('operations');setOperationView('scout');return}setGmailBusy(true);setGmailMessage('');try{const p=await gmailAction({action:'start'});if(!p.url)throw new Error('Google no devolvió la URL de autorización.');window.location.assign(String(p.url))}catch(error){setGmailMessage(error instanceof Error?error.message:'No se pudo conectar Gmail.');setGmailBusy(false)}},[gmailBusy,gmail.connected,gmailAction])
 useEffect(()=>{void loadGmail()},[loadGmail])
 useEffect(()=>{const params=new URLSearchParams(window.location.search),result=params.get('scout_gmail');if(result==='connected'){setGmailMessage('Gmail conectado correctamente.');void loadGmail()}else if(result==='error')setGmailMessage('Google no pudo completar la conexión de Gmail.');if(result){params.delete('scout_gmail');const query=params.toString();window.history.replaceState({},'',`${window.location.pathname}${query?`?${query}`:''}${window.location.hash}`)}},[loadGmail])
 const title=useMemo(()=>({home:'Inicio',operations:'Operaciones',people:'Personas',finance:'Finanzas',settings:'Configuración',superadmin:'Super Admin'}[section]),[section])
 const hugoSection=useMemo(()=>section==='operations'?`operations:${operationView}`:section==='people'?`people:${peopleView}`:section==='finance'?`finance:${financeView}`:section==='settings'?`settings:${settingsView}`:section,[section,operationView,peopleView,financeView,settingsView])
 const opMeta:Record<OperationView,{eyebrow:string;title:string}>={overview:{eyebrow:'RESUMEN OPERATIVO',title:'Estado general de la operación'},map:{eyebrow:'MAPA EN VIVO',title:'Proveedores y servicios sobre el territorio'},services:{eyebrow:'SERVICIOS',title:'Pedidos y trabajos activos'},alerts:{eyebrow:'ALERTAS',title:'Eventos que requieren atención'},disputes:{eyebrow:'DISPUTAS',title:'Conflictos y resoluciones'},scout:{eyebrow:'SCOUT UGO',title:'Prospección y detección de oportunidades'},history:{eyebrow:'HISTORIAL',title:'Trazabilidad completa de UGO'},messages:{eyebrow:'MENSAJES',title:'WhatsApp y atención operativa'}}
 const openPeople=(view:PeopleView)=>{setSection('people');setPeopleView(view)}
 const openFinance=(view:FinanceView)=>{setSection('finance');setFinanceView(view)}
 const openService=(serviceId:string)=>{setSelectedServiceId(serviceId);setSection('operations');setOperationView('services')}
 const applyHugoNavigation=useCallback((target:string)=>{
  if(target==='home'){setSection('home');return}
  if(target==='superadmin'){if(isSuperAdmin)setSection('superadmin');return}
  const[group,view]=target.split(':')
  if(group==='operations'&&['overview','map','services','alerts','disputes','scout','history','messages'].includes(view)){setSection('operations');setOperationView(view as OperationView);return}
  if(group==='people'&&['users','verification','documents','kyc','import'].includes(view)){setSection('people');setPeopleView(view as PeopleView);return}
  if(group==='finance'&&['pix','vault','tariffs'].includes(view)){setSection('finance');setFinanceView(view as FinanceView);return}
  if(group==='settings'&&['categories','analytics','notifications','reports','system'].includes(view)){setSection('settings');setSettingsView(view as SettingsView)}
 },[isSuperAdmin])
 const runHugoAction=useCallback(async(action:HugoUiAction)=>{
  if(action.type==='refresh'){await load();return}
  if(action.type==='navigate'){if(action.target)applyHugoNavigation(action.target);return}
  if(action.type==='open_service'){
   if(action.service_id){openService(action.service_id);return}
   const number=Number(action.service_number);if(!Number.isFinite(number))return
   const{data,error}=await(supabase as any).from('servicios').select('id,numero').eq('numero',number).order('created_at',{ascending:false}).limit(1).maybeSingle()
   if(!error&&data?.id)openService(String(data.id))
   return
  }
  if(action.type==='map_filter'){
   setSection('operations');setOperationView('map')
   window.setTimeout(()=>window.dispatchEvent(new CustomEvent('ugo:admin:map-command',{detail:action})),120)
  }
 },[applyHugoNavigation,load])
 useEffect(()=>{const handler=(event:Event)=>{const action=(event as CustomEvent<HugoUiAction>).detail;if(action?.type)void runHugoAction(action)};window.addEventListener('ugo:admin:hugo-action',handler as EventListener);return()=>window.removeEventListener('ugo:admin:hugo-action',handler as EventListener)},[runHugoAction])
 const nativeWrap=(node:React.ReactNode)=><div className="ugo-admin2-native-module">{node}</div>
 const current=(value:boolean):'page'|undefined=>value?'page':undefined
 return <div className={`ugo-admin2${section==='home'?' ugo-admin-stitch':''}`}>
  <aside className="ugo-admin2-sidebar"><div className="ugo-admin2-brand"><span>U.GO</span><small>CONTROL CENTER</small></div><nav aria-label="Navegación Admin">
   <button aria-current={current(section==='home')} className={section==='home'?'active':''} onClick={()=>setSection('home')}><b>⌂</b><span>Inicio</span></button>
   <button aria-current={current(section==='operations')} className={section==='operations'?'active':''} onClick={()=>setSection('operations')}><b>◎</b><span>Operaciones</span>{metrics.active>0&&<em>{metrics.active}</em>}</button>
   <button aria-current={current(section==='people')} className={section==='people'?'active':''} onClick={()=>setSection('people')}><b>♙</b><span>Personas</span>{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button>
   <button aria-current={current(section==='finance')} className={section==='finance'?'active':''} onClick={()=>setSection('finance')}><b>◫</b><span>Finanzas</span>{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button>
   <button aria-current={current(section==='settings')} className={section==='settings'?'active':''} onClick={()=>setSection('settings')}><b>⚙</b><span>Configuración</span></button>
   {isSuperAdmin&&<button aria-current={current(section==='superadmin')} className={section==='superadmin'?'active':''} onClick={()=>setSection('superadmin')}><b>◉</b><span>Super Admin</span></button>}
  </nav><div className={`ugo-admin2-status${metricsError||roleError?' degraded':''}`}><i/>{roleError?'Rol no verificado':metricsError?'Datos degradados':liveStatus==='live'?'Sistema en vivo':liveStatus==='connecting'?'Conectando Realtime':'Realtime degradado'}<small>{roleError?roleError:metricsError?'Reintentar actualización':updated?`Sincronizado ${updated.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Sincronizando…'}</small></div></aside>
  <main className={`ugo-admin2-main${hugoVoiceActive?' hugo-voice-active':''}`}><header><div><small>UGO · {isSuperAdmin?'SUPER ADMIN':'ADMIN'}</small><h1>{title}</h1></div><div className="ugo-admin2-head-actions"><button type="button" className={`ugo-admin2-gmail${gmail.connected?' connected':''}`} onClick={()=>void connectGmail()} disabled={gmailBusy} title={gmail.connected?'Abrir Scout con Gmail conectado':gmail.configured?'Conectar cuenta Gmail para invitaciones Scout':'Configurar OAuth de Google para Gmail Scout'}><i/>{gmailBusy?'Conectando…':gmail.connected?`Gmail · ${gmail.email||'conectado'}`:'✉ Conectar Gmail'}</button><button className="ugo-admin2-refresh" onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></div></header>
   {gmailMessage&&<div className={`ugo-admin2-gmail-message${gmail.connected?' ok':''}`} role="status"><span>{gmailMessage}</span><button type="button" onClick={()=>setGmailMessage('')}>×</button></div>}
   {metricsError&&<div className="ugo-admin2-metrics-error" role="alert"><div><strong>Indicadores temporalmente desactualizados</strong><span>{metricsError}</span></div><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Reintentando…':'Reintentar'}</button></div>}
   {section==='home'&&<AdminHomeStitch metrics={metrics} loading={loading} onOpenServices={()=>{setSection('operations');setOperationView('services')}} onOpenService={openService} onOpenVerification={()=>openPeople('verification')} onOpenPix={()=>openFinance('pix')}/>}
   {section==='operations'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>OPERACIONES</small><h2>Control operativo UGO</h2></div><span>{metrics.active} reales activos</span></div><div className="ugo-admin2-operations-menu" role="group" aria-label="Menú de operaciones">
    <button aria-pressed={operationView==='overview'} className={operationView==='overview'?'active':''} onClick={()=>setOperationView('overview')}><b>◈</b><span>Resumen</span><small>Estado general</small></button><button aria-pressed={operationView==='map'} className={operationView==='map'?'active':''} onClick={()=>setOperationView('map')}><b>🗺</b><span>Mapa</span><small>Operación en vivo</small></button><button aria-pressed={operationView==='services'} className={operationView==='services'?'active':''} onClick={()=>setOperationView('services')}><b>⊞</b><span>Servicios</span><small>Pedidos activos</small>{metrics.active>0&&<em>{metrics.active}</em>}</button><button aria-pressed={operationView==='alerts'} className={operationView==='alerts'?'active':''} onClick={()=>setOperationView('alerts')}><b>△</b><span>Alertas</span><small>Atención operativa</small></button><button aria-pressed={operationView==='disputes'} className={operationView==='disputes'?'active':''} onClick={()=>setOperationView('disputes')}><b>⊘</b><span>Disputas</span><small>Casos abiertos</small></button><button aria-pressed={operationView==='scout'} className={operationView==='scout'?'active':''} onClick={()=>setOperationView('scout')}><b>📡</b><span>Scout</span><small>Oportunidades</small></button><button aria-pressed={operationView==='history'} className={operationView==='history'?'active':''} onClick={()=>setOperationView('history')}><b>▤</b><span>Historial</span><small>Trazabilidad</small></button><button aria-pressed={operationView==='messages'} className={operationView==='messages'?'active':''} onClick={()=>setOperationView('messages')}><b>◌</b><span>Mensajes</span><small>WhatsApp</small></button>
   </div><div className="ugo-admin2-operation-context"><small>{opMeta[operationView].eyebrow}</small><strong>{opMeta[operationView].title}</strong></div>
   {operationView==='overview'&&nativeWrap(<AdminOverviewNative/>)}{operationView==='map'&&nativeWrap(<AdminMapNative/>)}{operationView==='services'&&nativeWrap(<AdminServicesPro initialServiceId={selectedServiceId} onInitialServiceConsumed={()=>setSelectedServiceId(null)}/>)}{operationView==='alerts'&&nativeWrap(<AdminAlertsDecisionCenter onOpenService={openService}/>)}{operationView==='disputes'&&nativeWrap(<AdminDisputesDecisionCenter/>)}{operationView==='scout'&&nativeWrap(<AdminScoutNative/>)}{operationView==='history'&&<div className="ugo-admin2-history"><ServiceHistoryPanel role="admin" embedded/></div>}{operationView==='messages'&&<div className="ugo-admin2-inline-tool ugo-admin2-messages"><WhatsAppAdminInbox/></div>}</section>}
   {section==='people'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>PERSONAS</small><h2>Clientes y proveedores</h2></div><span>{metrics.pendingProviders} verificaciones pendientes</span></div><div className="ugo-admin2-submenu" role="group" aria-label="Personas"><button aria-pressed={peopleView==='users'} className={peopleView==='users'?'active':''} onClick={()=>setPeopleView('users')}>Usuarios</button><button aria-pressed={peopleView==='verification'} className={peopleView==='verification'?'active':''} onClick={()=>setPeopleView('verification')}>Verificación{metrics.pendingProviders>0&&<em>{metrics.pendingProviders}</em>}</button><button aria-pressed={peopleView==='documents'} className={peopleView==='documents'?'active':''} onClick={()=>setPeopleView('documents')}>Documentos</button><button aria-pressed={peopleView==='kyc'} className={peopleView==='kyc'?'active':''} onClick={()=>setPeopleView('kyc')}>KYC</button><button aria-pressed={peopleView==='import'} className={peopleView==='import'?'active':''} onClick={()=>setPeopleView('import')}>Importar</button></div>{peopleView==='users'&&<div className="ugo-admin2-module-card"><AdminUsersPanel embedded canCreateOperator={isSuperAdmin}/></div>}{peopleView==='verification'&&<div className="ugo-admin2-module-card"><AdminProviderVerificationPanel/></div>}{peopleView==='documents'&&nativeWrap(<AdminDocumentsNative/>)}{peopleView==='kyc'&&nativeWrap(<AdminKycNative/>)}{peopleView==='import'&&nativeWrap(<AdminImportNative/>)}</section>}
   {section==='finance'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>FINANZAS · REAL</small><h2>Pagos, bóveda y tarifas</h2></div><span>{metrics.pendingPix} PIX reales pendientes</span></div><div className="ugo-admin2-submenu" role="group" aria-label="Finanzas"><button aria-pressed={financeView==='pix'} className={financeView==='pix'?'active':''} onClick={()=>setFinanceView('pix')}>PIX{metrics.pendingPix>0&&<em>{metrics.pendingPix}</em>}</button><button aria-pressed={financeView==='vault'} className={financeView==='vault'?'active':''} onClick={()=>setFinanceView('vault')}>Bóveda y retiros</button><button aria-pressed={financeView==='tariffs'} className={financeView==='tariffs'?'active':''} onClick={()=>setFinanceView('tariffs')}>Tarifas</button></div>{financeView==='pix'&&<div className="ugo-admin2-module-card"><PixReconciliationPanel/></div>}{financeView==='vault'&&nativeWrap(<AdminFinancePanel embedded/>)}{financeView==='tariffs'&&nativeWrap(<AdminTariffsNative/>)}</section>}
   {section==='settings'&&<section className="ugo-admin2-section"><div className="ugo-admin2-section-head"><div><small>CONFIGURACIÓN</small><h2>Sistema UGO</h2></div></div><div className="ugo-admin2-submenu" role="group" aria-label="Configuración"><button aria-pressed={settingsView==='categories'} className={settingsView==='categories'?'active':''} onClick={()=>setSettingsView('categories')}>Categorías</button><button aria-pressed={settingsView==='analytics'} className={settingsView==='analytics'?'active':''} onClick={()=>setSettingsView('analytics')}>Analytics</button><button aria-pressed={settingsView==='notifications'} className={settingsView==='notifications'?'active':''} onClick={()=>setSettingsView('notifications')}>Notificaciones</button><button aria-pressed={settingsView==='reports'} className={settingsView==='reports'?'active':''} onClick={()=>setSettingsView('reports')}>Reportes</button><button aria-pressed={settingsView==='system'} className={settingsView==='system'?'active':''} onClick={()=>setSettingsView('system')}>Sistema</button></div>{settingsView==='categories'&&nativeWrap(<AdminCategoriesNative/>)}{settingsView==='analytics'&&nativeWrap(<AdminReportsCenter/>)}{settingsView==='notifications'&&nativeWrap(<AdminNotificationsNative/>)}{settingsView==='reports'&&nativeWrap(<AdminReportsCenter/>)}{settingsView==='system'&&nativeWrap(<AdminSystemSettings/>)}</section>}
   {section==='superadmin'&&isSuperAdmin&&<section className="ugo-admin2-section"><SuperAdminCommandCenter/></section>}
  </main>
  {adminRole&&<ConversationalOrb metrics={metrics} role={isSuperAdmin?'superadmin':'admin'} section={hugoSection} onVoiceActiveChange={setHugoVoiceActive}/>} 
 </div>
}
