import React,{useEffect,useState}from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import{UgoLanding}from'./UgoLanding'
import{UgoWeb}from'./UgoWeb'
import{UgoClientWeb}from'./UgoClientWeb'
import{AppLocationButton}from'./AppLocationButton'
import{DemoSebastianPaymentBridge}from'./DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import{DisputeDock}from'./DisputeDock'
import{ClientGlobalMenu}from'./ClientGlobalMenu'
import{ClientCompletionReview}from'./ClientCompletionReview'
import{ClientFlowProvider,useClientFlow}from'./client/clientFlow'
import{getRoleSupabase}from'../lib/roleSupabase'
import{Button,Input}from'./shared'
import'./mvp.css'
import'./ugo-design-system.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'
import'./stitch-client-provider-alignment.css'

// UGO Cliente: la revisión final se monta junto al flujo principal para bloquear la liberación hasta revisar evidencias.
export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 const demo=new URLSearchParams(window.location.search).get('demo')==='1'
 if(app==='client-web'||app==='web-client'||app==='stitch-client')return <UgoClientWeb/>
 if(app==='client')return <RecoveryGate role="client"><ClientFlowProvider><ClientRoot demo={demo}/></ClientFlowProvider></RecoveryGate>
 if(app==='provider')return <RecoveryGate role="provider"><div className="ugo-provider-root"><ProviderOnboardingGate/><ServiceHistoryPanel role="provider"/><DisputeDock role="provider"/><AppLocationButton role="provider"/></div></RecoveryGate>
 if(app==='admin')return<AdminGate/>
 if(app==='web')return<UgoWeb/>
 return<UgoLanding/>
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

function ClientRoot({demo}:{demo:boolean}){
 const flow=useClientFlow()
 return <div className="ugo-client-root">{demo&&<DemoSebastianPaymentBridge/>}<ClientOnboardingGate/><ClientGlobalMenu/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceHistoryPanel role="client" openRequest={flow.screen==='history'}/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/></div>
}
