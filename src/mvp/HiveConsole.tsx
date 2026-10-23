import React,{useEffect,useState} from 'react'
import{supabase}from'../lib/supabase'
import{useLocale}from'../i18n/locale'
import{useDialog}from'./dialogs'
import'./hive-console.css'

const translations={
 'pt-BR':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'Status de TEST indisponível',backupLabel:'backup',navLabel:'Navegação Hive',overview:'Visão geral',chat:'Chat IA',agents:'Agentes',heading:'Centro de inteligência',disabled:'CHAT TEST · EXECUÇÃO MANUAL',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; execução real ainda não verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NÃO VERIFICADO',providerInfo:'Provedor, modelo, endpoint, pinning e custo pendentes de verificação.',
 remote:'Render / persistência',remoteInfo:'Disponibilidade remota não comprovada.',
 autonomy:'Empresa Autônoma',off:'NÃO ATIVADA',autonomyInfo:'Autonomy Gate permanece independente.',
 operational:'Estado operacional',notice:'Este painel é informativo. Não executa missões nem concede permissões. Métricas reais exigem API autenticada.',
 docs:'Consultar documentação técnica ↗',conversation:'Conversa com Hugo',gateway:'Gateway de inferência indisponível até verificação e autorização.',
 offline:'OFFLINE',slow:'RESPOSTA LENTA',remoteError:'ERRO DE CONEXÃO',nochat:'Chat não conectado',nochatInfo:'Não existem respostas simuladas. Histórico e streaming dependem de backend seguro.',
 message:'Mensagem',placeholder:'Indisponível enquanto a inferência está desativada',send:'Enviar · indisponível',
 macOnline:'Mac conectada',macOffline:'Mac desconectada',macName:'Supabase TEST · FreeLLMAPI Mac',enrollInfo:'TEST · Gere uma credencial nova somente se não houver um worker válido. O hash é calculado no Edge; o token aparece uma vez para guardar no Keychain.',enrollAction:'Gerar credencial TEST',workerTokenLabel:'Token temporário do worker TEST',tokenSaved:'Token guardado no Keychain',revokeWorker:'Revogar worker TEST',revokeConfirm:'Revogar o worker TEST? O processo local parará no próximo acesso autenticado.',engineStatus:'Motor local',engineAvailable:'Disponível · catálogo recente',engineUnavailable:'Não disponível ou não verificado',inferenceStatus:'Última consulta real persistida',submitReady:'Enviar',waiting:'Aguardando resposta da Mac',activeChat:'Chat TEST',sendError:'Não foi possível enviar',legacy:'Histórico sem agente',planned:'Funções planejadas',plannedInfo:'Catálogo proposto; nenhum agente é declarado operacional.',missionTab:'Missões',missionTitle:'Missões TEST',missionCancel:'Cancelar',missionEnvironment:'Ambiente TEST'
 },
 'es':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'Estado de TEST no disponible',backupLabel:'respaldo',navLabel:'Navegación Hive',overview:'Vista general',chat:'Chat IA',agents:'Agentes',heading:'Centro de inteligencia',disabled:'CHAT TEST · EJECUCIÓN MANUAL',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; ejecución real todavía no verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NO VERIFICADO',providerInfo:'Proveedor, modelo, endpoint, pinning y costo pendientes de verificación.',
 remote:'Render / persistencia',remoteInfo:'Disponibilidad remota no comprobada.',
 autonomy:'Empresa Autónoma',off:'NO ACTIVADA',autonomyInfo:'Autonomy Gate continúa independiente.',
 operational:'Estado operativo',notice:'Este panel es informativo. No ejecuta misiones ni concede permisos. Las métricas reales requieren una API autenticada.',
 docs:'Consultar documentación técnica ↗',conversation:'Conversación con Hugo',gateway:'Gateway de inferencia no disponible hasta su verificación y autorización.',
 offline:'SIN CONEXIÓN',slow:'RESPUESTA LENTA',remoteError:'ERROR DE CONEXIÓN',nochat:'Chat no conectado',nochatInfo:'No hay respuestas simuladas. El historial y streaming requieren un backend seguro.',
 message:'Mensaje',placeholder:'No disponible mientras la inferencia esté desactivada',send:'Enviar · no disponible',
 macOnline:'Mac conectada',macOffline:'Mac desconectada',macName:'Supabase TEST · FreeLLMAPI Mac',enrollInfo:'TEST · Generá una credencial nueva sólo si no hay un worker válido. El Edge calcula el hash; el token se muestra una vez para guardarlo en Keychain.',enrollAction:'Generar credencial TEST',workerTokenLabel:'Token temporal del worker TEST',tokenSaved:'Token guardado en Keychain',revokeWorker:'Revocar worker TEST',revokeConfirm:'¿Revocar el worker TEST? El proceso local se detendrá en el próximo acceso autenticado.',engineStatus:'Motor local',engineAvailable:'Disponible · catálogo reciente',engineUnavailable:'No disponible o no verificado',inferenceStatus:'Última consulta real persistida',submitReady:'Enviar',waiting:'Esperando respuesta de la Mac',activeChat:'Chat TEST',sendError:'No se pudo enviar',legacy:'Histórico sin agente',planned:'Roles previstos',plannedInfo:'Catálogo propuesto; ningún agente está declarado operativo.',missionTab:'Misiones',missionTitle:'Misiones TEST',missionCancel:'Cancelar',missionEnvironment:'Entorno TEST'
 },
 'en':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'TEST status unavailable',backupLabel:'backup',navLabel:'Hive navigation',overview:'Overview',chat:'AI Chat',agents:'Agents',heading:'Intelligence center',disabled:'TEST CHAT · MANUAL ONLY',
 router:'Hive Router',prepared:'PREPARED',routerInfo:'Code integrated; real runtime not yet verified.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NOT VERIFIED',providerInfo:'Provider, model, endpoint, pinning and cost require verification.',
 remote:'Render / persistence',remoteInfo:'Remote availability unverified.',
 autonomy:'Autonomous Company',off:'NOT ENABLED',autonomyInfo:'Autonomy Gate remains independent.',
 operational:'Operational status',notice:'This is an informational panel. It cannot run missions or grant permissions. Real metrics require an authenticated API.',
 docs:'Technical documentation ↗',conversation:'Chat with Hugo',gateway:'Inference gateway unavailable until verified and authorized.',
 offline:'OFFLINE',slow:'SLOW RESPONSE',remoteError:'CONNECTION ERROR',nochat:'Chat not connected',nochatInfo:'No simulated answers. History and streaming require a secure backend.',
 message:'Message',placeholder:'Unavailable while inference is disabled',send:'Send · unavailable',
 macOnline:'Mac connected',macOffline:'Mac disconnected',macName:'Supabase TEST · FreeLLMAPI Mac',enrollInfo:'TEST · Generate a new credential only if no valid worker exists. The Edge calculates the hash; the token is shown once to store in Keychain.',enrollAction:'Generate TEST credential',workerTokenLabel:'Temporary TEST worker token',tokenSaved:'Token stored in Keychain',revokeWorker:'Revoke TEST worker',revokeConfirm:'Revoke the TEST worker? The local process will stop on its next authenticated request.',engineStatus:'Local engine',engineAvailable:'Available · recent catalog',engineUnavailable:'Unavailable or unverified',inferenceStatus:'Last persisted real query',submitReady:'Send',waiting:'Waiting for Mac response',activeChat:'TEST Chat',sendError:'Could not send',legacy:'Legacy unattributed',planned:'Planned roles',plannedInfo:'Proposed catalog; no agents are claimed operational.',missionTab:'Missions',missionTitle:'TEST Missions',missionCancel:'Cancel',missionEnvironment:'TEST environment'
 }
} as const
const HIVE_MODEL='qwen3-coder-free'
const catalog=['Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research'] as const
// These are analysis personas using the existing inference-only worker, not autonomous agents.
type HiveStatus={environment:string;backend:{reachable:boolean;state?:'ONLINE'|'TIMEOUT'|'HTTP_ERROR'|'NETWORK_ERROR';http_status?:number|null;checked_at:string;latency_ms:number};backup:{state:string;version?:string;bytes?:number;created_at?:string};inference:{state:string};autonomy:{state:string}}
type Tab='overview'|'chat'|'agents'|'missions'
type HiveMission={id:string;objective:string;agents:string[];position:number;status:string;current_job_id:string|null;created_at:string}
export function HiveConsole(){
 const{locale}=useLocale()
 const tr=locale.startsWith('pt')?translations['pt-BR']:locale.startsWith('es')?translations.es:translations.en
 const{confirm,node:dialogNode}=useDialog()
 const[tab,setTab]=useState<Tab>('overview')
 const[status,setStatus]=useState<HiveStatus|null>(null)
 const[statusError,setStatusError]=useState(false)
 const [prompt,setPrompt]=useState('')
 const [selectedAgent,setSelectedAgent]=useState<typeof catalog[number]>('Hugo')
 const [sending,setSending]=useState(false)
 const [chatError,setChatError]=useState('')
 const [jobs,setJobs]=useState<Array<{id:string;status:string;answer?:string|null;model?:string|null;error_code?:string|null;agent?:string;created_at:string;updated_at?:string}>>([])
 const [chatVerified,setChatVerified]=useState(false)
 const [workerConnected,setWorkerConnected]=useState(false)
 const [workerEnrolled,setWorkerEnrolled]=useState(false)
 const [workerEnrollmentToken,setWorkerEnrollmentToken]=useState('')
 const [engineAvailable,setEngineAvailable]=useState(false)
 const [engineStatus,setEngineStatus]=useState('UNKNOWN')
 const [engineCheckedAt,setEngineCheckedAt]=useState<string|null>(null)
 const [missions,setMissions]=useState<HiveMission[]>([])
 const [missionFlow,setMissionFlow]=useState<string[]>(['Hugo','Architect','Developer','QA','Security','Judge'])
 const [missionBusy,setMissionBusy]=useState(false)
 const pendingMissionRef=React.useRef<{signature:string;key:string}|null>(null)
 const pendingChatRef=React.useRef<{signature:string;key:string}|null>(null)
 useEffect(()=>{let active=true;const load=async()=>{try{const {data,error}=await supabase.functions.invoke<HiveStatus>('ugo-hive-status',{method:'GET'});if(!active)return;if(error||!data||data.environment!=='TEST')throw new Error('STATUS_UNAVAILABLE');setStatus(data);setStatusError(false)}catch{if(active){setStatus(null);setStatusError(true)}}};void load();return()=>{active=false}},[])
 useEffect(()=>{if(tab!=='chat')return;let live=true;const refresh=async()=>{try{const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'list'}});if(!live)return;if(error||!Array.isArray(data?.jobs))throw Error('CHAT_UNAVAILABLE');setJobs(data.jobs);setChatVerified(true);const w=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'worker_status'}});if(!w.error&&live){setWorkerConnected(w.data?.connected===true);setWorkerEnrolled(w.data?.enrolled===true);setEngineAvailable(w.data?.engine_available===true);setEngineStatus(typeof w.data?.engine_status==='string'?w.data.engine_status:'UNKNOWN');setEngineCheckedAt(typeof w.data?.engine_checked_at==='string'?w.data.engine_checked_at:null)}else if(live){setWorkerConnected(false);setEngineAvailable(false)}}catch{if(live){setChatVerified(false);setWorkerConnected(false);setEngineAvailable(false);setChatError(tr.remoteError)}}};void refresh();const id=setInterval(()=>void refresh(),5000);return()=>{live=false;clearInterval(id)}},[tab,tr.remoteError]);
 useEffect(()=>{if(tab!=='missions')return;let live=true;const refresh=async()=>{try{
  const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'list_missions'}});
  if(!live)return;if(error||!Array.isArray(data?.missions))throw Error('MISSION_LIST_UNAVAILABLE');
  setMissions(data.missions);
  for(const mission of data.missions as HiveMission[]){
   if(mission.status!=='RUNNING'&&mission.status!=='PENDING')continue;
   await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'advance_mission',mission_id:mission.id}});
  }
 }catch{if(live)setChatError(tr.remoteError)}};void refresh();const interval=setInterval(()=>void refresh(),5000);return()=>{live=false;clearInterval(interval)}},[tab,tr.remoteError]);
 const createMission=async()=>{if(!prompt.trim()||missionBusy)return;setMissionBusy(true);setChatError('');try{
  const signature=JSON.stringify([prompt.trim(),missionFlow]);
  if(pendingMissionRef.current?.signature!==signature)pendingMissionRef.current={signature,key:crypto.randomUUID()};
  const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'create_mission',objective:prompt.trim(),agents:missionFlow,idempotency_key:pendingMissionRef.current.key}});
  if(error||!data?.mission_id)throw Error('MISSION_CREATE_FAILED');
  pendingMissionRef.current=null;
  setPrompt('');
  await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'advance_mission',mission_id:data.mission_id}});
  const refreshed=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'list_missions'}});
  if(!refreshed.error&&Array.isArray(refreshed.data?.missions))setMissions(refreshed.data.missions);
 }catch{setChatError(tr.sendError)}finally{setMissionBusy(false)}};
 const cancelMission=async(id:string)=>{const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'cancel_mission',mission_id:id}});
  if(error||data?.result!==true)setChatError(tr.remoteError);else setMissions(old=>old.map(m=>m.id===id?{...m,status:'CANCELLED'}:m))};
 const provisionWorker=async()=>{setChatError('');const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');try{const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'provision_worker',worker_token:token}});if(error||data?.ok!==true)throw Error('PROVISION_FAILED');setWorkerEnrolled(true);setWorkerConnected(false);setEngineAvailable(false);setEngineStatus('UNKNOWN');setEngineCheckedAt(null);setWorkerEnrollmentToken(token)}catch{setChatError(tr.remoteError)}}
 const disableWorker=async()=>{if(!await confirm({title:tr.revokeWorker,message:tr.revokeConfirm,confirmLabel:tr.revokeWorker,danger:true}))return;setChatError('');try{const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'disable_worker'}});if(error||data?.ok!==true)throw Error('WORKER_DISABLE_FAILED');setWorkerEnrolled(false);setWorkerConnected(false);setEngineAvailable(false);setEngineStatus('UNKNOWN');setEngineCheckedAt(null);setWorkerEnrollmentToken('')}catch{setChatError(tr.remoteError)}}
 const sendPrompt=async()=>{const value=prompt.trim();if(!value||value.length>3600||sending)return;setSending(true);setChatError('');const signature=JSON.stringify([value,selectedAgent]);if(pendingChatRef.current?.signature!==signature)pendingChatRef.current={signature,key:crypto.randomUUID()};const id=pendingChatRef.current.key;try{const {data,error}=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'create',prompt:value,agent:selectedAgent,idempotency_key:id}});if(error||!data?.job?.id)throw Error('CREATE_FAILED');pendingChatRef.current=null;setPrompt('');const r=await supabase.functions.invoke('ugo-hive-local-jobs',{body:{action:'list'}});if(!r.error&&Array.isArray(r.data?.jobs))setJobs(r.data.jobs)}catch{setChatError(tr.sendError)}finally{setSending(false)}}
 return <div className="ugo-hive">
  <header className="ugo-hive-header"><div><small>{tr.brand}</small><h1>UGO Hive</h1><p>{tr.heading}</p></div><strong className="ugo-hive-state">{tr.disabled}</strong></header>
  <nav className="ugo-hive-tabs" aria-label={tr.navLabel}>
   <button type="button" aria-current={tab==='overview'?'page':undefined} onClick={()=>setTab('overview')}>{tr.overview}</button>
   <button type="button" aria-current={tab==='chat'?'page':undefined} onClick={()=>setTab('chat')}>{tr.chat}</button>
   <button type="button" aria-current={tab==='agents'?'page':undefined} onClick={()=>setTab('agents')}>{tr.agents}</button>
   <button type="button" aria-current={tab==='missions'?'page':undefined} onClick={()=>setTab('missions')}>{tr.missionTab}</button>
  </nav>
  {tab==='overview'&&<div className="ugo-hive-stack"><div className="ugo-hive-cards">
   <article><small>{tr.router}</small><strong>{tr.prepared}</strong><p>{tr.routerInfo}</p></article>
   <article><small>{tr.provider}</small><strong>{tr.unverified}</strong><p>{tr.providerInfo}</p></article>
   <article><small>{tr.remote}</small><strong>{status?(status.backend.reachable?'ONLINE':status.backend.state==='TIMEOUT'?tr.slow:status.backend.state==='NETWORK_ERROR'?tr.remoteError:tr.offline):tr.unverified}</strong><p>{status?('TEST · '+status.backend.checked_at+' · '+status.backend.latency_ms+' ms'+(status.backend.http_status?' · HTTP '+status.backend.http_status:'')):tr.remoteInfo}</p></article>
   <article><small>{tr.autonomy}</small><strong>{tr.off}</strong><p>{tr.autonomyInfo}</p></article>
  </div><section className="ugo-hive-panel"><h2>{tr.operational}</h2><p>{tr.notice}</p><p role="status">{status?.backup?.state==='RECORDED'?('TEST · '+tr.backupLabel+' '+status.backup.version+' · '+status.backup.bytes+' bytes'):statusError?tr.statusUnavailable:tr.unverified}</p>
   <a href="https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/ugo-hive/IMPLEMENTATION_STATUS.md" target="_blank" rel="noopener noreferrer">{tr.docs}</a>
  </section></div>}
  {tab==='chat'&&<section className="ugo-hive-panel ugo-hive-chat">
   <div className="ugo-hive-chat-title"><div><h2>{tr.conversation}</h2><p>{tr.macName} · {tr.off}</p></div><span>{workerConnected?tr.macOnline:workerEnrolled?tr.macOffline:tr.offline}</span></div>
   <div role="status"><p>{tr.engineStatus}: {engineAvailable?tr.engineAvailable:tr.engineUnavailable} · {engineStatus}{engineCheckedAt?' · '+new Date(engineCheckedAt).toLocaleString():''}</p><p>{tr.inferenceStatus}: {jobs[0]?.status??tr.unverified}{jobs[0]?' · '+new Date(jobs[0].updated_at??jobs[0].created_at).toLocaleString():''}</p></div>
   <div className="ugo-hive-chat-empty" role="status">{jobs.length===0?<p>{tr.nochatInfo}</p>:jobs.map(job=><article key={job.id} style={{overflowWrap:'anywhere',padding:'0.7rem 0',borderBottom:'1px solid var(--ugo-border, #ccc)'}}><small>{job.status} · {job.agent??tr.legacy} · {job.model??HIVE_MODEL} · {new Date(job.created_at).toLocaleString()}</small><p>{job.answer||(job.status==='FAILED'?job.error_code:tr.waiting)}</p></article>)}</div>
   {!workerEnrolled&&<div><p>{tr.enrollInfo}</p><button type="button" onClick={()=>void provisionWorker()}>{tr.enrollAction}</button></div>}
   {workerEnrollmentToken&&<div><p>{tr.enrollInfo}</p><code aria-label={tr.workerTokenLabel} style={{display:'block',overflowWrap:'anywhere',userSelect:'all'}}>{workerEnrollmentToken}</code><button type="button" onClick={()=>setWorkerEnrollmentToken('')}>{tr.tokenSaved}</button></div>}
   {workerEnrolled&&!workerEnrollmentToken&&<button type="button" onClick={()=>void disableWorker()}>{tr.revokeWorker}</button>}
   {chatError&&<p role="alert">{chatError}</p>}
   <label htmlFor="ugo-hive-agent">{tr.agents}</label><select id="ugo-hive-agent" value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value as typeof catalog[number])}>{catalog.map(name=><option key={name} value={name}>{name}</option>)}</select>
   <label htmlFor="ugo-hive-message">{tr.message}</label><textarea id="ugo-hive-message" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={3600} placeholder={tr.message} rows={3}/>
   <button type="button" disabled={!chatVerified||sending||!prompt.trim()} onClick={()=>void sendPrompt()}>{sending?tr.waiting:tr.submitReady}</button>
  </section>}
  {tab==='missions'&&<section className="ugo-hive-panel">
   <h2>{tr.missionTitle}</h2>
   <p>{tr.off} · {tr.missionEnvironment} · {tr.macName}</p>
   <label htmlFor="hive-mission-objective">{tr.message}</label>
   <textarea id="hive-mission-objective" rows={3} maxLength={1800} value={prompt} onChange={e=>setPrompt(e.target.value)}/>
   <fieldset><legend>{tr.agents}</legend>{catalog.map(name=><label key={name} style={{display:'inline-flex',gap:'0.35rem',margin:'0.4rem'}}><input type="checkbox" checked={missionFlow.includes(name)} onChange={e=>setMissionFlow(prev=>e.target.checked?[...prev,name]:prev.filter(x=>x!==name))}/>{name}</label>)}</fieldset>
   <button type="button" disabled={missionBusy||!prompt.trim()||missionFlow.length===0} onClick={()=>void createMission()}>{tr.submitReady}</button>
   {chatError&&<p role="alert">{chatError}</p>}
   <div role="status">{missions.map(m=><article key={m.id} style={{padding:'0.7rem 0',borderBottom:'1px solid var(--ugo-border,#ccc)'}}>
    <strong>{m.status} · {m.position}/{m.agents.length}</strong><p>{m.objective}</p>
    <small>{m.agents.join(' → ')} · {m.id}</small>
    {(m.status==='RUNNING'||m.status==='PENDING')&&<button type="button" onClick={()=>void cancelMission(m.id)}>{tr.missionCancel}</button>}
   </article>)}</div>
  </section>}
  {tab==='agents'&&<section className="ugo-hive-panel"><h2>{tr.planned}</h2><p>{tr.plannedInfo}</p>
   <div className="ugo-hive-agents">{catalog.map(name=><article key={name}><strong>{name}</strong><span>{tr.unverified}</span><button type="button" onClick={()=>{setSelectedAgent(name);setTab('chat')}}>{tr.chat} · {name}</button></article>)}</div>
  </section>}
  {dialogNode}
 </div>
}
