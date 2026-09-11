import React,{Suspense,lazy,useEffect,useState}from'react'
import{ClientFlowProvider}from'./client/clientFlow'
import{ProviderFlowProvider}from'./provider/providerFlow'
import{getRoleSupabase}from'../lib/roleSupabase'
import{Button,Input}from'./shared'
import'./mvp.css'
import'./ugo-design-system.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'
import'./stitch-client-provider-alignment.css'
import'./request-evidence.css'

const AdminGate=lazy(()=>import('./AdminGate').then(module=>({default:module.AdminGate})))
const ClientRoot=lazy(()=>import('./client/ClientRoot').then(module=>({default:module.ClientRoot})))
const ProviderRoot=lazy(()=>import('./provider/ProviderRoot').then(module=>({default:module.ProviderRoot})))
const UgoLanding=lazy(()=>import('./UgoLanding').then(module=>({default:module.UgoLanding})))
const UgoWeb=lazy(()=>import('./UgoWeb').then(module=>({default:module.UgoWeb})))
const UgoClientWeb=lazy(()=>import('./UgoClientWeb').then(module=>({default:module.UgoClientWeb})))

function RouteLoading(){return <main className="mvp-loading" aria-live="polite"><p>Cargando UGO…</p></main>}
function Deferred({children}:{children:React.ReactNode}){return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>}

export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 const demo=new URLSearchParams(window.location.search).get('demo')==='1'
 if(app==='client-web'||app==='web-client'||app==='stitch-client')return <Deferred><UgoClientWeb/></Deferred>
 if(app==='client')return <RecoveryGate role="client"><ClientFlowProvider><Deferred><ClientRoot demo={demo}/></Deferred></ClientFlowProvider></RecoveryGate>
 if(app==='provider')return <RecoveryGate role="provider"><ProviderFlowProvider><Deferred><ProviderRoot/></Deferred></ProviderFlowProvider></RecoveryGate>
 if(app==='admin')return <Deferred><AdminGate/></Deferred>
 if(app==='web')return <Deferred><UgoWeb/></Deferred>
 return <Deferred><UgoLanding/></Deferred>
}

function RecoveryGate({role,children}:{role:'client'|'provider';children:React.ReactNode}){
 const[phase,setPhase]=useState<'idle'|'checking'|'ready'|'done'|'error'>(()=>new URLSearchParams(window.location.search).has('code')?'checking':'idle')
 const[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const supabase=React.useMemo(()=>getRoleSupabase(role),[role])
 useEffect(()=>{const code=new URLSearchParams(window.location.search).get('code');if(!code)return;let alive=true;supabase.auth.exchangeCodeForSession(code).then(({error})=>{if(!alive)return;if(error){setMessage(error.message);setPhase('error')}else{setPhase('ready');const clean=new URL(window.location.href);clean.searchParams.delete('code');window.history.replaceState({},'',clean.toString())}}).catch(e=>{if(alive){setMessage(e instanceof Error?e.message:'No se pudo validar el enlace.');setPhase('error')}});return()=>{alive=false}},[role,supabase])
 if(phase==='idle'||phase==='done')return <>{children}</>
 async function save(e:React.FormEvent){e.preventDefault();if(password.length<8)return setMessage('La contraseña debe tener al menos 8 caracteres.');setBusy(true);setMessage('');const{error}=await supabase.auth.updateUser({password});setBusy(false);if(error)return setMessage(error.message);setPhase('done');setMessage('Contraseña actualizada. Ya podés continuar.')}
 return <main className={`mvp-auth-page role-${role}`}><section className="mvp-auth-card"><div className="mvp-mini-orb"/><div className="mvp-kicker">U.G.O. · {role==='client'?'CLIENTE':'PROVEEDOR'}</div><h1>{phase==='checking'?'Validando enlace…':phase==='error'?'Enlace no válido':'Elegí una contraseña nueva'}</h1>{phase==='checking'?<p>Estamos verificando tu enlace seguro.</p>:phase==='error'?<><p>{message}</p><Button className="mvp-primary" onClick={()=>window.location.replace(`${window.location.pathname}?app=${role}`)}>Volver a ingresar</Button></>:<form onSubmit={save}><p>Usá al menos 8 caracteres para proteger tu cuenta.</p><label>Nueva contraseña<Input type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{message&&<div className="mvp-form-notice">{message}</div>}<Button className="mvp-primary" loading={busy}>Guardar contraseña</Button></form>}</section></main>
}
