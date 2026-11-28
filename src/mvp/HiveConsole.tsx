import React,{useEffect,useState} from 'react'
import{supabase}from'../lib/supabase'
import{useLocale}from'../i18n/locale'
import{HIVE_CATALOG,HIVE_QUOTA_POLICY}from'./hiveCatalog'
import{HIVE_CONSOLE_ENDPOINT,loadHiveSnapshot,type HiveSnapshot}from'./hiveConsoleApi'
import'./hive-console.css'

const STATUS_TIMEOUT_MS=8000
const translations={
 'pt-BR':{
 brand:'U.GO · SUPER ADMIN', liveTitle:'Dados reais da fila',liveOff:'Endpoint de produção não configurado neste ambiente.',liveUnavailable:'API de Hive indisponível ou sem permissão para esta sessão.',liveWait:'Consultando a API autenticada…',liveQueued:'Na fila',liveLeased:'Em execução',liveDone:'Concluídas',liveFailed:'Falhas',liveAgentsLabel:'Agentes',liveOperative:'Operativos',liveEmergency:'Parada de emergência',liveEmergencyOn:'ATIVA',liveEmergencyOff:'inativa',liveMonthly:'Cota mensal',liveUpdated:'Atualizado',liveSchema:'esquema',statusUnavailable:'Status de TEST indisponível',backupLabel:'backup',navLabel:'Navegação Hive',overview:'Visão geral',chat:'Chat IA',departments:'Departamentos',heading:'Centro de inteligência',disabled:'INFERÊNCIA DESATIVADA',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; execução real ainda não verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NÃO VERIFICADO',providerInfo:'Provedor, modelo, endpoint, pinning e custo pendentes de verificação.',
 remote:'Render / persistência',remoteInfo:'Disponibilidade remota não comprovada.',timeout:'SEM RESPOSTA EM 8 S',retry:'Tentar novamente',
 autonomy:'Empresa Autônoma',off:'NÃO ATIVADA',autonomyInfo:'Autonomy Gate permanece independente.',
 operational:'Estado operacional',notice:'Este painel é informativo. Não executa missões nem concede permissões. Métricas reais exigem API autenticada.',
 docs:'Consultar documentação técnica ↗',conversation:'Conversa com Hugo',gateway:'Gateway de inferência indisponível até verificação e autorização.',
 offline:'OFFLINE',slow:'RESPOSTA LENTA',remoteError:'ERRO DE CONEXÃO',nochat:'Chat não conectado',nochatInfo:'Não existem respostas simuladas. Histórico e streaming dependem de backend seguro.',
 message:'Mensagem',placeholder:'Indisponível enquanto a inferência está desativada',send:'Enviar · indisponível',
 departmentTitle:'Departamentos canônicos',departmentInfo:'Catálogo documentado; nenhum agente é declarado operacional.',agentsLabel:'agentes',disabledAgents:'desativado',executionUnverified:'EXECUÇÃO NÃO VERIFICADA',agentStates:'Estados de agente: registrado · conectado · operativo · desabilitado. Só a API de Hive declara qual se aplica.',sourceLabel:'Fonte',snapshotLabel:'Snapshot',
 quotaTitle:'Política de cotas',quotaUnknown:'Consumo real: DESCONHECIDO · aplicam-se limites conservadores',quotaNotUsed:'A escada abaixo é política declarada. Não é consumo medido.'
 },
 'es':{
 brand:'U.GO · SUPER ADMIN', liveTitle:'Datos reales de la cola',liveOff:'Endpoint de producción no configurado en este entorno.',liveUnavailable:'API de Hive no disponible o sin permiso para esta sesión.',liveWait:'Consultando la API autenticada…',liveQueued:'En cola',liveLeased:'En ejecución',liveDone:'Completadas',liveFailed:'Fallidas',liveAgentsLabel:'Agentes',liveOperative:'Operativos',liveEmergency:'Parada de emergencia',liveEmergencyOn:'ACTIVA',liveEmergencyOff:'inactiva',liveMonthly:'Cuota mensual',liveUpdated:'Actualizado',liveSchema:'esquema',statusUnavailable:'Estado de TEST no disponible',backupLabel:'respaldo',navLabel:'Navegación Hive',overview:'Vista general',chat:'Chat IA',departments:'Departamentos',heading:'Centro de inteligencia',disabled:'INFERENCIA DESACTIVADA',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; ejecución real todavía no verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NO VERIFICADO',providerInfo:'Proveedor, modelo, endpoint, pinning y costo pendientes de verificación.',
 remote:'Render / persistencia',remoteInfo:'Disponibilidad remota no comprobada.',timeout:'SIN RESPUESTA EN 8 S',retry:'Reintentar',
 autonomy:'Empresa Autónoma',off:'NO ACTIVADA',autonomyInfo:'Autonomy Gate continúa independiente.',
 operational:'Estado operativo',notice:'Este panel es informativo. No ejecuta misiones ni concede permisos. Las métricas reales requieren una API autenticada.',
 docs:'Consultar documentación técnica ↗',conversation:'Conversación con Hugo',gateway:'Gateway de inferencia no disponible hasta su verificación y autorización.',
 offline:'SIN CONEXIÓN',slow:'RESPUESTA LENTA',remoteError:'ERROR DE CONEXIÓN',nochat:'Chat no conectado',nochatInfo:'No hay respuestas simuladas. El historial y streaming requieren un backend seguro.',
 message:'Mensaje',placeholder:'No disponible mientras la inferencia esté desactivada',send:'Enviar · no disponible',
 departmentTitle:'Departamentos canónicos',departmentInfo:'Catálogo documentado; ningún agente está declarado operativo.',agentsLabel:'agentes',disabledAgents:'desactivado',executionUnverified:'EJECUCIÓN NO VERIFICADA',agentStates:'Estados de agente: registrado · conectado · operativo · deshabilitado. Sólo la API de Hive declara cuál aplica.',sourceLabel:'Fuente',snapshotLabel:'Snapshot',
 quotaTitle:'Política de cuotas',quotaUnknown:'Consumo real: DESCONOCIDO · se aplican límites conservadores',quotaNotUsed:'La escalera siguiente es política declarada. No es consumo medido.'
 },
 'en':{
 brand:'U.GO · SUPER ADMIN', liveTitle:'Real queue data',liveOff:'Production endpoint not configured in this environment.',liveUnavailable:'Hive API unavailable or not permitted for this session.',liveWait:'Querying the authenticated API…',liveQueued:'Queued',liveLeased:'Running',liveDone:'Completed',liveFailed:'Failed',liveAgentsLabel:'Agents',liveOperative:'Operative',liveEmergency:'Emergency stop',liveEmergencyOn:'ACTIVE',liveEmergencyOff:'inactive',liveMonthly:'Monthly quota',liveUpdated:'Updated',liveSchema:'schema',statusUnavailable:'TEST status unavailable',backupLabel:'backup',navLabel:'Hive navigation',overview:'Overview',chat:'AI Chat',departments:'Departments',heading:'Intelligence center',disabled:'INFERENCE DISABLED',
 router:'Hive Router',prepared:'PREPARED',routerInfo:'Code integrated; real runtime not yet verified.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NOT VERIFIED',providerInfo:'Provider, model, endpoint, pinning and cost require verification.',
 remote:'Render / persistence',remoteInfo:'Remote availability unverified.',timeout:'NO RESPONSE IN 8 S',retry:'Retry',
 autonomy:'Autonomous Company',off:'NOT ENABLED',autonomyInfo:'Autonomy Gate remains independent.',
 operational:'Operational status',notice:'This is an informational panel. It cannot run missions or grant permissions. Real metrics require an authenticated API.',
 docs:'Technical documentation ↗',conversation:'Chat with Hugo',gateway:'Inference gateway unavailable until verified and authorized.',
 offline:'OFFLINE',slow:'SLOW RESPONSE',remoteError:'CONNECTION ERROR',nochat:'Chat not connected',nochatInfo:'No simulated answers. History and streaming require a secure backend.',
 message:'Message',placeholder:'Unavailable while inference is disabled',send:'Send · unavailable',
 departmentTitle:'Canonical departments',departmentInfo:'Documented catalog; no agent is claimed operational.',agentsLabel:'agents',disabledAgents:'disabled',executionUnverified:'EXECUTION UNVERIFIED',agentStates:'Agent states: registered · connected · operative · disabled. Only the Hive API declares which applies.',sourceLabel:'Source',snapshotLabel:'Snapshot',
 quotaTitle:'Quota policy',quotaUnknown:'Real consumption: UNKNOWN · conservative limits applied',quotaNotUsed:'The ladder below is declared policy. It is not measured consumption.'
 }
} as const
type HiveStatus={environment:string;backend:{reachable:boolean;state?:'ONLINE'|'TIMEOUT'|'HTTP_ERROR'|'NETWORK_ERROR';http_status?:number|null;checked_at:string;latency_ms:number};backup:{state:string;version?:string;bytes?:number;created_at?:string};inference:{state:string};autonomy:{state:string}}
type Tab='overview'|'chat'|'departments'
export function HiveConsole(){
 const{locale}=useLocale()
 const tr=locale.startsWith('pt')?translations['pt-BR']:locale.startsWith('es')?translations.es:translations.en
 const[tab,setTab]=useState<Tab>('overview')
 const[status,setStatus]=useState<HiveStatus|null>(null)
 const[statusError,setStatusError]=useState<''|'TIMEOUT'|'UNAVAILABLE'>('')
 const[attempt,setAttempt]=useState(0)
 const[live,setLive]=useState<HiveSnapshot|null>(null)
 const[liveState,setLiveState]=useState<'OFF'|'LOADING'|'READY'|'TIMEOUT'|'FORBIDDEN'|'ERROR'>(HIVE_CONSOLE_ENDPOINT?'LOADING':'OFF')
 useEffect(()=>{
  // One on-demand request per mount. No polling: Hive is event-driven, so an idle
  // console must stay idle. The abort keeps a stalled Hive from holding a socket.
  let active=true
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),STATUS_TIMEOUT_MS)
  const load=async()=>{try{const {data,error}=await supabase.functions.invoke<HiveStatus>('ugo-hive-status',{method:'GET',signal:controller.signal});if(!active)return;if(error||!data||data.environment!=='TEST')throw new Error('STATUS_UNAVAILABLE');setStatus(data);setStatusError('')}catch{if(!active)return;setStatus(null);setStatusError(controller.signal.aborted?'TIMEOUT':'UNAVAILABLE')}finally{clearTimeout(timer)}}
  void load()
  return()=>{active=false;clearTimeout(timer);controller.abort()}
 },[attempt])
 useEffect(()=>{
  // Datos reales por el endpoint autenticado: una sola lectura acotada, sin sondeo. Sin
  // endpoint configurado no se pide nada y la consola lo declara en vez de inventar cifras.
  if(!HIVE_CONSOLE_ENDPOINT)return
  let active=true
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),STATUS_TIMEOUT_MS)
  const load=async()=>{
   try{
    const{data}=await supabase.auth.getSession()
    const token=data.session?.access_token
    if(!token){if(active)setLiveState('FORBIDDEN');return}
    const snapshot=await loadHiveSnapshot({token,signal:controller.signal})
    if(!active)return
    setLive(snapshot);setLiveState('READY')
   }catch(error){
    if(!active)return
    const code=(error as{code?:string}).code
    setLive(null)
    setLiveState(controller.signal.aborted?'TIMEOUT':code==='FORBIDDEN'||code==='AUTH_REQUIRED'?'FORBIDDEN':'ERROR')
   }finally{clearTimeout(timer)}
  }
  void load()
  return()=>{active=false;clearTimeout(timer);controller.abort()}
 },[attempt])
 const remoteLabel=status?(status.backend.reachable?'ONLINE':status.backend.state==='TIMEOUT'?tr.slow:status.backend.state==='NETWORK_ERROR'?tr.remoteError:tr.offline):tr.unverified
 const statusText=statusError==='TIMEOUT'?tr.timeout:statusError==='UNAVAILABLE'?tr.statusUnavailable:status?.backup?.state==='RECORDED'?('TEST · '+tr.backupLabel+' '+status.backup.version+' · '+status.backup.bytes+' bytes'):tr.unverified
 return <div className="ugo-hive">
  <header className="ugo-hive-header"><div><small>{tr.brand}</small><h1>UGO Hive</h1><p>{tr.heading}</p></div><strong className="ugo-hive-state">{tr.disabled}</strong></header>
  <nav className="ugo-hive-tabs" aria-label={tr.navLabel}>
   <button type="button" aria-current={tab==='overview'?'page':undefined} onClick={()=>setTab('overview')}>{tr.overview}</button>
   <button type="button" aria-current={tab==='chat'?'page':undefined} onClick={()=>setTab('chat')}>{tr.chat}</button>
   <button type="button" aria-current={tab==='departments'?'page':undefined} onClick={()=>setTab('departments')}>{tr.departments}</button>
  </nav>
  {tab==='overview'&&<div className="ugo-hive-stack"><div className="ugo-hive-cards">
   <article><small>{tr.router}</small><strong>{tr.prepared}</strong><p>{tr.routerInfo}</p></article>
   <article><small>{tr.provider}</small><strong>{tr.unverified}</strong><p>{tr.providerInfo}</p></article>
   <article><small>{tr.remote}</small><strong>{remoteLabel}</strong><p>{status?('TEST · '+status.backend.checked_at+' · '+status.backend.latency_ms+' ms'+(status.backend.http_status?' · HTTP '+status.backend.http_status:'')):tr.remoteInfo}</p></article>
   <article><small>{tr.autonomy}</small><strong>{tr.off}</strong><p>{tr.autonomyInfo}</p></article>
  </div>
  <section className="ugo-hive-panel"><h2>{tr.operational}</h2><p>{tr.notice}</p><p role="status">{statusText}</p>
   {liveState==='OFF'?<p><small>{tr.liveOff}</small></p>:null}
   {liveState==='LOADING'?<p><small>{tr.liveWait}</small></p>:null}
   {liveState==='TIMEOUT'||liveState==='ERROR'||liveState==='FORBIDDEN'?<p><small>{tr.liveUnavailable}</small></p>:null}
   {liveState==='READY'&&live?<div className="ugo-hive-agents" data-source={live.source}>
    <article><small>{tr.liveQueued}</small><strong>{live.queue.queued}</strong></article>
    <article><small>{tr.liveLeased}</small><strong>{live.queue.leased}</strong></article>
    <article><small>{tr.liveDone}</small><strong>{live.queue.succeeded}</strong></article>
    <article><small>{tr.liveFailed}</small><strong>{live.queue.failed}</strong></article>
    <article><small>{tr.liveAgentsLabel}</small><strong>{live.census.total}</strong></article>
    <article><small>{tr.liveOperative}</small><strong>{live.census.operative} / {live.census.max_operative_agents}</strong></article>
    <article><small>{tr.liveEmergency}</small><strong>{live.emergency.stop?tr.liveEmergencyOn:tr.liveEmergencyOff}</strong></article>
    <article><small>{tr.liveMonthly}</small><strong>{live.quotas.openrouter.monthly_quota}</strong></article>
    <small>{tr.liveTitle} · {tr.liveUpdated}: {live.generated_at??'—'} · {tr.liveSchema} {live.schema_version}</small>
   </div>:null}
   {statusError?<button type="button" onClick={()=>setAttempt(value=>value+1)}>{tr.retry}</button>:null}
   <a href="https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/ugo-hive/HIVE_ISOLATION.md" target="_blank" rel="noopener noreferrer">{tr.docs}</a>
  </section>
  <section className="ugo-hive-panel"><h2>{tr.quotaTitle}</h2><p><strong>{tr.quotaUnknown}</strong> {tr.quotaNotUsed}</p>
   <div className="ugo-hive-agents">{HIVE_QUOTA_POLICY.map(step=><article key={step.at}><strong>{step.at}% · {step.action}</strong><span>{step.detail}</span></article>)}</div>
  </section></div>}
  {tab==='chat'&&<section className="ugo-hive-panel ugo-hive-chat">
   <div className="ugo-hive-chat-title"><div><h2>{tr.conversation}</h2><p>{tr.gateway}</p></div><span>{tr.offline}</span></div>
   <div className="ugo-hive-chat-empty" role="status"><strong>{tr.nochat}</strong><p>{tr.nochatInfo}</p></div>
   <label htmlFor="ugo-hive-message">{tr.message}</label><textarea id="ugo-hive-message" placeholder={tr.placeholder} disabled rows={3}/>
   <button type="button" disabled>{tr.send}</button>
  </section>}
  {tab==='departments'&&<section className="ugo-hive-panel"><h2>{tr.departmentTitle}</h2>
   <p>{tr.departmentInfo} <strong>{tr.executionUnverified}</strong></p>
   <p><small>{tr.agentStates}</small></p>
   <p><small>{tr.sourceLabel}: {HIVE_CATALOG.source} · {tr.snapshotLabel}: {HIVE_CATALOG.capturedAt} · {HIVE_CATALOG.environment} · {HIVE_CATALOG.departments.length} · {HIVE_CATALOG.totalAgents} {tr.agentsLabel} · {HIVE_CATALOG.disabledAgents} {tr.disabledAgents}</small></p>
   <div className="ugo-hive-agents">{HIVE_CATALOG.departments.map(department=><article key={department.id}>
    <strong>D{department.id} · {department.name}</strong>
    <span>{department.agents} {tr.agentsLabel} · {tr.executionUnverified}</span>
    <small>{department.focus}</small>
   </article>)}</div>
  </section>}
 </div>
}
