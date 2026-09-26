import React,{Suspense,lazy,useEffect,useState}from'react'
import{useUgoI18n}from'../i18n/i18n'
import{ClientFlowProvider}from'../features/client/flow/clientFlow'
import{ProviderFlowProvider}from'./provider/providerFlow'
import{getRoleSupabase}from'../lib/roleSupabase'
import{resolveAppRoute}from'../app/router'
import{Button,Input,LoadingScreen}from'./shared'
import'./mvp.css'
import'./ugo-design-system.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'
import'./stitch-client-provider-alignment.css'
import'../features/client/request/clientRequestEvidence.css'
import'./ugo-uiux-p0.css'
import'./ugo-dark-premium.css'
import'./ugo-visual-refresh.css'
import'./ugo-auth-redesign.css'
import'./browser-role-shell.css'

const AdminGate=lazy(()=>import('./AdminGate').then(module=>({default:module.AdminGate})))
const DevelopmentDashboard=lazy(()=>import('./DevelopmentDashboard').then(module=>({default:module.DevelopmentDashboard})))
const ClientRoot=lazy(()=>import('../features/client/ClientRoot').then(module=>({default:module.ClientRoot})))
const ProviderRoot=lazy(()=>import('./provider/ProviderRoot').then(module=>({default:module.ProviderRoot})))
const UgoLanding=lazy(()=>import('./UgoLanding').then(module=>({default:module.UgoLanding})))
const UgoWeb=lazy(()=>import('./UgoWeb').then(module=>({default:module.UgoWeb})))
const UgoDemoBoundary=lazy(()=>import('./UgoDemoBoundary').then(module=>({default:module.UgoDemoBoundary})))
const UgoClientWeb=lazy(()=>import('./UgoClientWeb').then(module=>({default:module.UgoClientWeb})))
const UgoTestDemo=lazy(()=>import('./UgoTestDemo').then(module=>({default:module.UgoTestDemo})))
const ProviderRecruitmentLanding=lazy(()=>import('./ProviderRecruitmentLanding').then(module=>({default:module.ProviderRecruitmentLanding})))

function RouteLoading(){const{t}=useUgoI18n();return <LoadingScreen label={t('common.loading')}/>}
function Deferred({children}:{children:React.ReactNode}){return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>}
function BrowserShell({children}:{children:React.ReactNode}){return <div className="ugo-browser-role-shell"><div className="ugo-browser-role-app">{children}</div></div>}
function ClientApp({web=false}:{web?:boolean}){const app=<RecoveryGate role="client"><ClientFlowProvider><Deferred><ClientRoot demo={false}/></Deferred></ClientFlowProvider></RecoveryGate>;return web?<BrowserShell>{app}</BrowserShell>:app}
function ProviderApp({web=false}:{web?:boolean}){const app=<RecoveryGate role="provider"><ProviderFlowProvider><Deferred><ProviderRoot/></Deferred></ProviderFlowProvider></RecoveryGate>;return web?<BrowserShell>{app}</BrowserShell>:app}

export function MvpApp(){
 const route=resolveAppRoute(window.location.search)
 if(route==='demo')return <Deferred><UgoTestDemo/></Deferred>
 if(route==='recruit')return <Deferred><ProviderRecruitmentLanding/></Deferred>
 if(route==='client-web')return <ClientApp web/>
 if(route==='provider-web')return <ProviderApp web/>
 if(route==='stitch-client')return <Deferred><UgoClientWeb/></Deferred>
 if(route==='client')return <ClientApp/>
 if(route==='provider')return <ProviderApp/>
 if(route==='development')return <Deferred><DevelopmentDashboard/></Deferred>
 if(route==='admin')return <Deferred><AdminGate/></Deferred>
 if(route==='web')return <Deferred><UgoDemoBoundary><UgoWeb/></UgoDemoBoundary></Deferred>
 return <Deferred><UgoLanding/></Deferred>
}

type RecoveryPhase='idle'|'checking'|'ready'|'success'|'error'
function hasImplicitRecoveryToken(){const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));return hash.get('type')==='recovery'&&Boolean(hash.get('access_token'))}
function cleanRecoveryUrl(){const clean=new URL(window.location.href);clean.searchParams.delete('code');clean.searchParams.delete('auth');clean.hash='';window.history.replaceState({},'',clean.toString())}
function RecoveryGate({role,children}:{role:'client'|'provider';children:React.ReactNode}){
 const{t}=useUgoI18n()
 const hasCode=new URLSearchParams(window.location.search).has('code'),recoveryIntent=hasCode||hasImplicitRecoveryToken()||new URLSearchParams(window.location.search).get('auth')==='recovery'
 const[phase,setPhase]=useState<RecoveryPhase>(()=>recoveryIntent?'checking':'idle'),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const supabase=React.useMemo(()=>getRoleSupabase(role),[role])
 useEffect(()=>{if(!recoveryIntent)return;let alive=true,settled=false;const ready=()=>{if(!alive||settled)return;settled=true;cleanRecoveryUrl();setMessage('');setPhase('ready')},fail=(text:string)=>{if(!alive||settled)return;settled=true;setMessage(text);setPhase('error')},code=new URLSearchParams(window.location.search).get('code');const{data:listener}=supabase.auth.onAuthStateChange((event,session)=>{if(alive&&(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session)ready()});if(code){supabase.auth.exchangeCodeForSession(code).then(({data,error})=>{if(error)return fail(error.message);if(data.session)ready();else fail(t('recovery.invalidSession'))}).catch(e=>fail(e instanceof Error?e.message:t('recovery.validateError')))}else{supabase.auth.getSession().then(({data,error})=>{if(error)return fail(error.message);if(data.session)ready();else fail(t('recovery.expired'))}).catch(e=>fail(e instanceof Error?e.message:'No se pudo validar el enlace.'))}return()=>{alive=false;listener.subscription.unsubscribe()}},[recoveryIntent,supabase])
 if(phase==='idle')return <>{children}</>
 async function save(e:React.FormEvent){e.preventDefault();setMessage('');if(password.length<8)return setMessage(t('recovery.min'));if(password!==confirmPassword)return setMessage(t('recovery.mismatch'));setBusy(true);const{error}=await supabase.auth.updateUser({password});if(error){setBusy(false);setMessage(error.message);return}await supabase.auth.signOut();setBusy(false);setPassword('');setConfirmPassword('');setMessage(t('recovery.success'));setPhase('success')}
 const backToLogin=()=>window.location.replace(`${window.location.pathname}?app=${role}`)
 return <main className={`mvp-auth-page role-${role}`}><section className="mvp-auth-card" aria-live="polite"><div className="mvp-mini-orb"/><div className="mvp-kicker">U.G.O. · {role==='client'?t('recovery.client'):t('recovery.provider')}</div><h1>{phase==='checking'?t('recovery.checking'):phase==='error'?t('recovery.invalid'):phase==='success'?t('recovery.updated'):t('recovery.newPassword')}</h1>{phase==='checking'?<p>{t('recovery.verifying')}</p>:phase==='error'?<><p role="alert">{message}</p><Button className="mvp-primary" onClick={backToLogin}>{t('recovery.another')}</Button></>:phase==='success'?<><p role="status">{message}</p><Button className="mvp-primary" onClick={backToLogin}>{t('recovery.enter')}</Button></>:<form onSubmit={save}><p>{t('recovery.instructions')}</p><label>{t('recovery.password')}<Input type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>{t('recovery.repeat')}<Input type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label>{message&&<div className="mvp-form-notice" role="alert">{message}</div>}<Button className="mvp-primary" loading={busy}>{t('recovery.save')}</Button></form>}</section></main>
}
