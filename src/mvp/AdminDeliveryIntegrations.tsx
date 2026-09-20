import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'

type ProviderId='uber'|'ifood'|'rappi'
type ProviderRow={id:ProviderId;label:string;configured:boolean;docs:string;required:string[];capabilities:string[];note:string}
type TestResult={provider:ProviderId;ok:boolean;configured:boolean;state:string;message:string;status?:number;testedAt?:string;expiresIn?:number|null;merchants?:number|null}
type Payload={providers:ProviderRow[]}

async function adminRequest(path:string,init:RequestInit={}){
 const run=async(token:string)=>fetch(path,{...init,headers:{...(init.headers||{}),Authorization:`Bearer ${token}`}})
 let{data:{session}}=await supabase.auth.getSession()
 if(!session){const refreshed=await supabase.auth.refreshSession();session=refreshed.data.session}
 if(!session)throw new Error('Sessão Admin necessária.')
 let response=await run(session.access_token)
 if(response.status===401){
  const refreshed=await supabase.auth.refreshSession()
  if(refreshed.data.session)response=await run(refreshed.data.session.access_token)
 }
 return response
}

const stateLabel:Record<string,string>={
 missing_credentials:'Aguardando credenciais',
 auth_failed:'Falha de autenticação',
 authenticated:'Autenticado',
 authenticated_waiting_permissions:'Autenticado · aguardando permissões',
 operational:'Operacional',
 reachable:'Conectado',
 test_failed:'Falha no teste'
}

export function AdminDeliveryIntegrations(){
 const[providers,setProviders]=useState<ProviderRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[testing,setTesting]=useState<ProviderId|null>(null),[results,setResults]=useState<Partial<Record<ProviderId,TestResult>>>({})
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const response=await adminRequest('/api/admin/delivery-integrations')
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(payload.error||'Não foi possível carregar as integrações.')
   setProviders((payload as Payload).providers||[])
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as integrações.')}finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])

 async function test(provider:ProviderId){
  setTesting(provider);setError('')
  try{
   const response=await adminRequest('/api/admin/delivery-integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})})
   const payload=await response.json().catch(()=>({}))
   const result={provider,ok:response.ok,configured:Boolean(payload.configured),state:String(payload.state||'test_failed'),message:String(payload.message||payload.error||'Falha na verificação.'),status:payload.status,testedAt:payload.testedAt,expiresIn:payload.expiresIn,merchants:payload.merchants} as TestResult
   setResults(v=>({...v,[provider]:result}))
  }catch(e){setResults(v=>({...v,[provider]:{provider,ok:false,configured:false,state:'test_failed',message:e instanceof Error?e.message:'Falha na verificação.'}}))}finally{setTesting(null)}
 }

 return <div className="ugo-delivery-integrations">
  <header><div><small>MARKETPLACES E LOGÍSTICA</small><h4>Uber · iFood · Rappi</h4><p>Conectores server-side. Segredos não são enviados ao navegador.</p></div><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Atualizando…':'↻ Atualizar'}</button></header>
  {error&&<div className="ugo-delivery-integration-error" role="alert">{error}</div>}
  <div className="ugo-delivery-integration-grid">{providers.map(item=>{const result=results[item.id];return <article key={item.id} className={`ugo-delivery-integration-card ${item.configured?'configured':'waiting'}`}>
   <header><div><small>{item.id==='uber'?'ENTREGAS':item.id==='ifood'?'MERCHANT / SHIPPING':'OPEN ORDERS / CARGO'}</small><strong>{item.label}</strong></div><span>{result?stateLabel[result.state]||result.state:item.configured?'Configurada':'Aguardando credenciais'}</span></header>
   <p>{item.note}</p>
   <div className="ugo-delivery-capabilities">{item.capabilities.map(x=><span key={x}>{x}</span>)}</div>
   <div className="ugo-delivery-required"><b>Credenciais server-side</b>{item.required.map(x=><code key={x}>{x}</code>)}</div>
   {result&&<div className={`ugo-delivery-test-result ${result.ok?'ok':'fail'}`}><strong>{result.message}</strong>{result.merchants!=null&&<span>{result.merchants} merchant(s) acessível(is)</span>}{result.expiresIn!=null&&<span>Token válido por {Math.round(result.expiresIn/60)} min</span>}</div>}
   <footer><a href={item.docs} target="_blank" rel="noreferrer">Documentação oficial ↗</a><button type="button" onClick={()=>void test(item.id)} disabled={testing===item.id}>{testing===item.id?'Testando…':'Testar conexão'}</button></footer>
  </article>})}</div>
  <div className="ugo-system-note"><strong>Produção</strong><span>O conector pode ser instalado agora, mas a ativação real depende das credenciais e permissões de cada plataforma. O UGO não marca uma integração como operacional até o teste server-side passar.</span></div>
 </div>
}
