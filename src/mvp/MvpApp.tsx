import React,{Suspense,lazy,useEffect,useState}from'react'
import{ClientFlowProvider}from'./client/clientFlow'
import{ProviderFlowProvider}from'./provider/providerFlow'
import{getRoleSupabase}from'../lib/roleSupabase'
import{Button,Input,LoadingScreen}from'./shared'
import'./mvp.css'
import'./ugo-design-system.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'
import'./stitch-client-provider-alignment.css'
import'./request-evidence.css'
import'./ugo-uiux-p0.css'
import'./ugo-dark-premium.css'
import'./ugo-auth-redesign.css'
import'./browser-role-shell.css'

const AdminGate=lazy(()=>import('./AdminGate').then(module=>({default:module.AdminGate})))
const DevelopmentDashboard=lazy(()=>import('./DevelopmentDashboard').then(module=>({default:module.DevelopmentDashboard})))
const ClientRoot=lazy(()=>import('./client/ClientRoot').then(module=>({default:module.ClientRoot})))
const ProviderRoot=lazy(()=>import('./provider/ProviderRoot').then(module=>({default:module.ProviderRoot})))
const UgoLanding=lazy(()=>import('./UgoLanding').then(module=>({default:module.UgoLanding})))
const UgoWeb=lazy(()=>import('./UgoWeb').then(module=>({default:module.UgoWeb})))
const UgoDemoBoundary=lazy(()=>import('./UgoDemoBoundary').then(module=>({default:module.UgoDemoBoundary})))
const UgoClientWeb=lazy(()=>import('./UgoClientWeb').then(module=>({default:module.UgoClientWeb})))
const UgoTestDemo=lazy(()=>import('./UgoTestDemo').then(module=>({default:module.UgoTestDemo})))

function RouteLoading(){return <LoadingScreen label="Abriendo UGO…"/>}
function Deferred({children}:{children:React.ReactNode}){return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>}
function BrowserShell({children}:{children:React.ReactNode}){return <div className="ugo-browser-role-shell"><div className="ugo-browser-role-app">{children}</div></div>}
function ClientApp({web=false}:{web?:boolean}){const app=<RecoveryGate role="client"><ClientFlowProvider><Deferred><ClientRoot demo={false}/></Deferred></ClientFlowProvider></RecoveryGate>;return web?<BrowserShell>{app}</BrowserShell>:app}
function ProviderApp({web=false}:{web?:boolean}){const app=<RecoveryGate role="provider"><ProviderFlowProvider><Deferred><ProviderRoot/></Deferred></ProviderFlowProvider></RecoveryGate>;return web?<BrowserShell>{app}</BrowserShell>:app}

export function MvpApp(){
 const params=new URLSearchParams(window.location.search)
 const app=params.get('app')
 const demo=params.get('demo')==='1'
 if(demo)return <Deferred><UgoTestDemo/></Deferred>
 if(app==='client-web'||app==='web-client')return <ClientApp web/>
 if(app==='provider-web'||app==='web-provider')return <ProviderApp web/>
 if(app==='stitch-client')return <Deferred><UgoClientWeb/></Deferred>
 if(app==='client')return <ClientApp/>
 if(app==='provider')return <ProviderApp/>
 if(app==='development')return <Deferred><DevelopmentDashboard/></Deferred>
 if(app==='admin')return <Deferred><AdminGate/></Deferred>
 if(app==='web')return <Deferred><UgoDemoBoundary><UgoWeb/></UgoDemoBoundary></Deferred>
 return <Deferred><UgoLanding/></Deferred>
}

type RecoveryPhase='idle'|'checking'|'ready'|'success'|'error'
function hasImplicitRecoveryToken(){const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));return hash.get('type')==='recovery'&&Boolean(hash.get('access_token'))}
function cleanRecoveryUrl(){const clean=new URL(window.location.href);clean.searchParams.delete('code');clean.searchParams.delete('auth');clean.hash='';window.history.replaceState({},'',clean.toString())}
function RecoveryGate({role,children}:{role:'client'|'provider';children:React.ReactNode}){
 const hasCode=new URLSearchParams(window.location.search).has('code'),recoveryIntent=hasCode||hasImplicitRecoveryToken()||new URLSearchParams(window.location.search).get('auth')==='recovery'
 const[phase,setPhase]=useState<RecoveryPhase>(()=>recoveryIntent?'checking':'idle'),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const supabase=React.useMemo(()=>getRoleSupabase(role),[role])
 useEffect(()=>{if(!recoveryIntent)return;let alive=true,settled=false;const ready=()=>{if(!alive||settled)return;settled=true;cleanRecoveryUrl();setMessage('');setPhase('ready')},fail=(text:string)=>{if(!alive||settled)return;settled=true;setMessage(text);setPhase('error')},code=new URLSearchParams(window.location.search).get('code');const{data:listener}=supabase.auth.onAuthStateChange((event,session)=>{if(alive&&(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session)ready()});if(code){supabase.auth.exchangeCodeForSession(code).then(({data,error})=>{if(error)return fail(error.message);if(data.session)ready();else fail('El enlace de recuperación no creó una sesión válida.')}).catch(e=>fail(e instanceof Error?e.message:'No se pudo validar el enlace.'))}else{supabase.auth.getSession().then(({data,error})=>{if(error)return fail(error.message);if(data.session)ready();else fail('El enlace venció o ya fue utilizado. Solicitá uno nuevo.')}).catch(e=>fail(e instanceof Error?e.message:'No se pudo validar el enlace.'))}return()=>{alive=false;listener.subscription.unsubscribe()}},[recoveryIntent,supabase])
 if(phase==='idle')return <>{children}</>
 async function save(e:React.FormEvent){e.preventDefault();setMessage('');if(password.length<8)return setMessage('La contraseña debe tener al menos 8 caracteres.');if(password!==confirmPassword)return setMessage('Las contraseñas no coinciden.');setBusy(true);const{error}=await supabase.auth.updateUser({password});if(error){setBusy(false);setMessage(error.message);return}await supabase.auth.signOut();setBusy(false);setPassword('');setConfirmPassword('');setMessage('Contraseña actualizada correctamente. Ya podés ingresar con la nueva contraseña.');setPhase('success')}
 const backToLogin=()=>window.location.replace(`${window.location.pathname}?app=${role}`)
 return <main className={`mvp-auth-page role-${role}`}><section className="mvp-auth-card" aria-live="polite"><div className="mvp-mini-orb"/><div className="mvp-kicker">U.G.O. · {role==='client'?'CLIENTE':'PROVEEDOR'}</div><h1>{phase==='checking'?'Validando enlace…':phase==='error'?'Enlace no válido':phase==='success'?'Contraseña actualizada':'Creá una contraseña nueva'}</h1>{phase==='checking'?<p>Estamos verificando tu enlace seguro de recuperación.</p>:phase==='error'?<><p role="alert">{message}</p><Button className="mvp-primary" onClick={backToLogin}>Solicitar otro enlace</Button></>:phase==='success'?<><p role="status">{message}</p><Button className="mvp-primary" onClick={backToLogin}>Ingresar a UGO</Button></>:<form onSubmit={save}><p>Usá al menos 8 caracteres. Al guardarla, cerraremos la sesión temporal del enlace.</p><label>Nueva contraseña<Input type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Repetí la contraseña<Input type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label>{message&&<div className="mvp-form-notice" role="alert">{message}</div>}<Button className="mvp-primary" loading={busy}>Guardar contraseña</Button></form>}</section></main>
}
