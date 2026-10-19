import React,{useEffect,useState} from 'react'
import{supabase}from'../lib/supabase'
import{useLocale}from'../i18n/locale'
import'./hive-console.css'

const translations={
 'pt-BR':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'Status de TEST indisponível',backupLabel:'backup',navLabel:'Navegação Hive',overview:'Visão geral',chat:'Chat IA',agents:'Agentes',heading:'Centro de inteligência',disabled:'INFERÊNCIA DESATIVADA',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; execução real ainda não verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NÃO VERIFICADO',providerInfo:'Provedor, modelo, endpoint, pinning e custo pendentes de verificação.',
 remote:'Render / persistência',remoteInfo:'Disponibilidade remota não comprovada.',
 autonomy:'Empresa Autônoma',off:'NÃO ATIVADA',autonomyInfo:'Autonomy Gate permanece independente.',
 operational:'Estado operacional',notice:'Este painel é informativo. Não executa missões nem concede permissões. Métricas reais exigem API autenticada.',
 docs:'Consultar documentação técnica ↗',conversation:'Conversa com Hugo',gateway:'Gateway de inferência indisponível até verificação e autorização.',
 offline:'OFFLINE',slow:'RESPOSTA LENTA',remoteError:'ERRO DE CONEXÃO',nochat:'Chat não conectado',nochatInfo:'Não existem respostas simuladas. Histórico e streaming dependem de backend seguro.',
 message:'Mensagem',placeholder:'Indisponível enquanto a inferência está desativada',send:'Enviar · indisponível',
 planned:'Funções planejadas',plannedInfo:'Catálogo proposto; nenhum agente é declarado operacional.'
 },
 'es':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'Estado de TEST no disponible',backupLabel:'respaldo',navLabel:'Navegación Hive',overview:'Vista general',chat:'Chat IA',agents:'Agentes',heading:'Centro de inteligencia',disabled:'INFERENCIA DESACTIVADA',
 router:'Router Hive',prepared:'PREPARADO',routerInfo:'Código integrado; ejecución real todavía no verificada.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NO VERIFICADO',providerInfo:'Proveedor, modelo, endpoint, pinning y costo pendientes de verificación.',
 remote:'Render / persistencia',remoteInfo:'Disponibilidad remota no comprobada.',
 autonomy:'Empresa Autónoma',off:'NO ACTIVADA',autonomyInfo:'Autonomy Gate continúa independiente.',
 operational:'Estado operativo',notice:'Este panel es informativo. No ejecuta misiones ni concede permisos. Las métricas reales requieren una API autenticada.',
 docs:'Consultar documentación técnica ↗',conversation:'Conversación con Hugo',gateway:'Gateway de inferencia no disponible hasta su verificación y autorización.',
 offline:'SIN CONEXIÓN',slow:'RESPUESTA LENTA',remoteError:'ERROR DE CONEXIÓN',nochat:'Chat no conectado',nochatInfo:'No hay respuestas simuladas. El historial y streaming requieren un backend seguro.',
 message:'Mensaje',placeholder:'No disponible mientras la inferencia esté desactivada',send:'Enviar · no disponible',
 planned:'Roles previstos',plannedInfo:'Catálogo propuesto; ningún agente está declarado operativo.'
 },
 'en':{
 brand:'U.GO · SUPER ADMIN',statusUnavailable:'TEST status unavailable',backupLabel:'backup',navLabel:'Hive navigation',overview:'Overview',chat:'AI Chat',agents:'Agents',heading:'Intelligence center',disabled:'INFERENCE DISABLED',
 router:'Hive Router',prepared:'PREPARED',routerInfo:'Code integrated; real runtime not yet verified.',
 provider:'FreeLLMAPI / OpenRouter',unverified:'NOT VERIFIED',providerInfo:'Provider, model, endpoint, pinning and cost require verification.',
 remote:'Render / persistence',remoteInfo:'Remote availability unverified.',
 autonomy:'Autonomous Company',off:'NOT ENABLED',autonomyInfo:'Autonomy Gate remains independent.',
 operational:'Operational status',notice:'This is an informational panel. It cannot run missions or grant permissions. Real metrics require an authenticated API.',
 docs:'Technical documentation ↗',conversation:'Chat with Hugo',gateway:'Inference gateway unavailable until verified and authorized.',
 offline:'OFFLINE',slow:'SLOW RESPONSE',remoteError:'CONNECTION ERROR',nochat:'Chat not connected',nochatInfo:'No simulated answers. History and streaming require a secure backend.',
 message:'Message',placeholder:'Unavailable while inference is disabled',send:'Send · unavailable',
 planned:'Planned roles',plannedInfo:'Proposed catalog; no agents are claimed operational.'
 }
} as const
const catalog=['Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research'] as const
type HiveStatus={environment:string;backend:{reachable:boolean;state?:'ONLINE'|'TIMEOUT'|'HTTP_ERROR'|'NETWORK_ERROR';http_status?:number|null;checked_at:string;latency_ms:number};backup:{state:string;version?:string;bytes?:number;created_at?:string};inference:{state:string};autonomy:{state:string}}
type Tab='overview'|'chat'|'agents'
type KeyCheck={state:'idle'|'checking'|'verified'|'failed';code?:string}
export function HiveConsole(){
 const{locale}=useLocale()
 const tr=locale.startsWith('pt')?translations['pt-BR']:locale.startsWith('es')?translations.es:translations.en
 const[tab,setTab]=useState<Tab>('overview')
 const[status,setStatus]=useState<HiveStatus|null>(null)
 const[statusError,setStatusError]=useState(false)
 const[keyCheck,setKeyCheck]=useState<KeyCheck>({state:'idle'})
 const checkKey=async()=>{
  setKeyCheck({state:'checking'})
  try{
   const {data,error}=await supabase.functions.invoke<{ok:boolean;code:string}>('ugo-hive-model-router',{
    method:'POST',body:{action:'check_openrouter_key'}
   })
   if(error||data?.ok!==true||data.code!=='OPENROUTER_KEY_AUTHENTICATED'){
    setKeyCheck({state:'failed',code:data?.code||'KEY_CHECK_FAILED'});return
   }
   setKeyCheck({state:'verified',code:data.code})
  }catch{setKeyCheck({state:'failed',code:'KEY_CHECK_UNREACHABLE'})}
 }
 useEffect(()=>{let active=true;const load=async()=>{try{const {data,error}=await supabase.functions.invoke<HiveStatus>('ugo-hive-status',{method:'GET'});if(!active)return;if(error||!data||data.environment!=='TEST')throw new Error('STATUS_UNAVAILABLE');setStatus(data);setStatusError(false)}catch{if(active){setStatus(null);setStatusError(true)}}};void load();return()=>{active=false}},[])
 return <div className="ugo-hive">
  <header className="ugo-hive-header"><div><small>{tr.brand}</small><h1>UGO Hive</h1><p>{tr.heading}</p></div><strong className="ugo-hive-state">{tr.disabled}</strong></header>
  <nav className="ugo-hive-tabs" aria-label={tr.navLabel}>
   <button type="button" aria-current={tab==='overview'?'page':undefined} onClick={()=>setTab('overview')}>{tr.overview}</button>
   <button type="button" aria-current={tab==='chat'?'page':undefined} onClick={()=>setTab('chat')}>{tr.chat}</button>
   <button type="button" aria-current={tab==='agents'?'page':undefined} onClick={()=>setTab('agents')}>{tr.agents}</button>
  </nav>
  {tab==='overview'&&<div className="ugo-hive-stack"><div className="ugo-hive-cards">
   <article><small>{tr.router}</small><strong>{tr.prepared}</strong><p>{tr.routerInfo}</p></article>
   <article><small>{tr.provider}</small><strong>{tr.unverified}</strong><p>{tr.providerInfo}</p></article>
   <article><small>{tr.remote}</small><strong>{status?(status.backend.reachable?'ONLINE':status.backend.state==='TIMEOUT'?tr.slow:status.backend.state==='NETWORK_ERROR'?tr.remoteError:tr.offline):tr.unverified}</strong><p>{status?('TEST · '+status.backend.checked_at+' · '+status.backend.latency_ms+' ms'+(status.backend.http_status?' · HTTP '+status.backend.http_status:'')):tr.remoteInfo}</p></article>
   <article><small>{tr.autonomy}</small><strong>{tr.off}</strong><p>{tr.autonomyInfo}</p></article>
  </div><section className="ugo-hive-panel"><h2>{tr.operational}</h2><p>{tr.notice}</p><p role="status">{status?.backup?.state==='RECORDED'?('TEST · '+tr.backupLabel+' '+status.backup.version+' · '+status.backup.bytes+' bytes'):statusError?tr.statusUnavailable:tr.unverified}</p>
   <a href="https://github.com/sebastisnzoth/ugo-admin-panel/blob/main/docs/ugo-hive/IMPLEMENTATION_STATUS.md" target="_blank" rel="noopener noreferrer">{tr.docs}</a>
   <div><button type="button" disabled={keyCheck.state==='checking'} onClick={()=>{void checkKey()}}>{locale.startsWith('pt')?'Verificar chave OpenRouter':locale.startsWith('es')?'Verificar clave OpenRouter':'Check OpenRouter key'}</button>
   <p role="status" aria-live="polite">{keyCheck.state==='checking'?'Consultando OpenRouter…':keyCheck.state==='verified'?'OPENROUTER_KEY_AUTHENTICATED':keyCheck.state==='failed'?(keyCheck.code||'KEY_CHECK_FAILED'):tr.unverified}</p></div>
  </section></div>}
  {tab==='chat'&&<section className="ugo-hive-panel ugo-hive-chat">
   <div className="ugo-hive-chat-title"><div><h2>{tr.conversation}</h2><p>{tr.gateway}</p></div><span>{tr.offline}</span></div>
   <div className="ugo-hive-chat-empty" role="status"><strong>{tr.nochat}</strong><p>{tr.nochatInfo}</p></div>
   <label htmlFor="ugo-hive-message">{tr.message}</label><textarea id="ugo-hive-message" placeholder={tr.placeholder} disabled rows={3}/>
   <button type="button" disabled>{tr.send}</button>
  </section>}
  {tab==='agents'&&<section className="ugo-hive-panel"><h2>{tr.planned}</h2><p>{tr.plannedInfo}</p>
   <div className="ugo-hive-agents">{catalog.map(name=><article key={name}><strong>{name}</strong><span>{tr.unverified}</span></article>)}</div>
  </section>}
 </div>
}
