import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{LoadingScreen}from'./shared'
import'./provider-recruitment.css'

type Invite={nombre:string;categoria:string;ciudad:string|null;telefono:string|null;email:string|null;expires_at:string;claimed:boolean}
type Mode='register'|'login'

export function ProviderRecruitmentLanding(){
 const sb=useMemo(()=>getRoleSupabase('provider'),[])
 const params=new URLSearchParams(window.location.search),token=params.get('invite')||''
 const[invite,setInvite]=useState<Invite|null>(null),[loading,setLoading]=useState(true),[invalid,setInvalid]=useState(false)
 const[session,setSession]=useState<any>(null),[claimed,setClaimed]=useState(false),[mode,setMode]=useState<Mode>('register')
 const[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')

 useEffect(()=>{let alive=true;(async()=>{
  if(!token){if(alive){setInvalid(true);setLoading(false)};return}
  const{data,error}=await(sb as any).rpc('scout_public_invitation',{p_token:token})
  const row=Array.isArray(data)?data[0]:data
  if(!alive)return
  if(error||!row){setInvalid(true);setLoading(false);return}
  setInvite(row as Invite);setName(String(row.nombre||''));setEmail(String(row.email||''));setLoading(false)
 })();return()=>{alive=false}},[sb,token])

 useEffect(()=>{sb.auth.getSession().then(({data})=>setSession(data.session));const{data:l}=sb.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>l.subscription.unsubscribe()},[sb])

 useEffect(()=>{if(!session||!token||claimed)return;let alive=true;(async()=>{
  setBusy(true);setMessage('Hugo está vinculando tu invitación con la cuenta…')
  const{error}=await(sb as any).rpc('scout_claim_invitation',{p_token:token})
  if(!alive)return
  if(error){setMessage(error.message);setBusy(false);return}
  setClaimed(true);setMessage('Listo. Tu cuenta quedó vinculada a la invitación de UGO.');setBusy(false)
 })();return()=>{alive=false}},[claimed,sb,session,token])

 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('')
  try{
   if(!email.trim())throw new Error('Ingresá un email para crear o recuperar tu cuenta.')
   if(password.length<6)throw new Error('La contraseña debe tener al menos 6 caracteres.')
   if(mode==='login'){
    const{error}=await sb.auth.signInWithPassword({email:email.trim(),password});if(error)throw error
   }else{
    if(!name.trim())throw new Error('Ingresá tu nombre.')
    const redirect=`${window.location.origin}${window.location.pathname}?app=recruit&invite=${encodeURIComponent(token)}`
    const{data,error}=await sb.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,data:{nombre:name.trim(),tipo:'proveedor'}}})
    if(error)throw error
    if(!data.session)setMessage('Cuenta creada. Revisá tu email y volvé por el enlace de confirmación para continuar con Hugo.')
   }
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo completar el acceso.')}
  finally{setBusy(false)}
 }

 if(loading)return <LoadingScreen label="Hugo está preparando tu invitación…"/>
 if(invalid||!invite)return <main className="ugo-recruit"><section className="ugo-recruit-invalid"><div className="ugo-recruit-orb">H</div><small>UGO · HUGO RECLUTAMIENTO</small><h1>Esta invitación ya no está disponible</h1><p>Puede haber vencido, sido revocada o ya utilizada. Pedile al equipo UGO un nuevo enlace.</p><button type="button" onClick={()=>window.location.replace(window.location.pathname)}>Volver a UGO</button></section></main>

 if(session&&claimed)return <div className="ugo-recruit-onboarding"><header className="ugo-recruit-minihead"><div className="ugo-recruit-orb">H</div><div><b>Hugo te acompaña</b><span>Tu invitación ya está vinculada. Completá el registro y subí los documentos.</span></div></header><ProviderOnboardingGate onVerified={()=>window.location.replace(`${window.location.pathname}?app=provider`)}/></div>

 return <main className="ugo-recruit">
  <section className="ugo-recruit-hero"><div className="ugo-recruit-brand"><div className="ugo-recruit-orb">H</div><div><b>UGO</b><span>Reclutamiento profesional</span></div></div><div className="ugo-recruit-copy"><small>INVITACIÓN PERSONAL</small><h1>{invite.nombre}, Hugo te da la bienvenida a UGO.</h1><p>Te invitamos a crear tu perfil profesional para recibir oportunidades de clientes cerca de tu zona.</p><div className="ugo-recruit-badges"><span>🛠️ {invite.categoria}</span><span>📍 {invite.ciudad||'Tu zona'}</span><span>🔒 Registro seguro</span></div></div><div className="ugo-recruit-roadmap">{[['1','Creá tu cuenta'],['2','Completá tu perfil'],['3','Subí documentos'],['4','UGO revisa'],['5','Quedás listo para trabajar']].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</div><aside className="ugo-recruit-hugo"><div className="ugo-recruit-orb">H</div><div><b>Hugo</b><p>Podés guardar tu progreso y volver con este mismo enlace mientras esté vigente.</p></div></aside></section>
  <section className="ugo-recruit-auth"><header><small>EMPEZAR REGISTRO</small><h2>{mode==='register'?'Creá tu cuenta profesional':'Ya tengo una cuenta'}</h2><p>Después de entrar, seguís directamente con perfil, documentos y validación.</p></header><div className="ugo-recruit-tabs"><button type="button" className={mode==='register'?'active':''} onClick={()=>{setMode('register');setMessage('')}}>Crear cuenta</button><button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setMessage('')}}>Ya tengo cuenta</button></div><form onSubmit={submit}>{mode==='register'&&<label>Nombre<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete={mode==='register'?'new-password':'current-password'} required/></label>{invite.telefono&&<div className="ugo-recruit-prefill"><span>WhatsApp encontrado por Scout</span><b>{invite.telefono}</b><small>Lo vas a poder confirmar o cambiar en el registro.</small></div>}{message&&<div className="ugo-recruit-message" role="status">{message}</div>}<button type="submit" className="primary" disabled={busy}>{busy?'Procesando…':mode==='register'?'Crear cuenta y continuar →':'Entrar y continuar →'}</button></form><p className="ugo-recruit-privacy">Tus documentos se usan para validar tu cuenta profesional. UGO no los publica.</p></section>
 </main>
}

export default ProviderRecruitmentLanding
