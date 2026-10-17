import{LocalizedText}from'../i18n/locale'
import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{LoadingScreen}from'./shared'
import{useLocale}from'../i18n/locale'
import'./provider-recruitment.css'

type Invite={nombre:string;categoria:string;ciudad:string|null;telefono:string|null;email:string|null;expires_at:string;claimed:boolean}
type Mode='register'|'login'

export function ProviderRecruitmentLanding(){
 const{t}=useLocale()
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
  setBusy(true);setMessage(t('recruit.loading'))
  const{error}=await(sb as any).rpc('scout_claim_invitation',{p_token:token})
  if(!alive)return
  if(error){setMessage(error.message);setBusy(false);return}
  setClaimed(true);setMessage(t('recruit.linked'));setBusy(false)
 })();return()=>{alive=false}},[claimed,sb,session,token])

 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('')
  try{
   if(!email.trim())throw new Error(t('recruit.errorEmail'))
   if(password.length<6)throw new Error(t('recruit.errorPassword'))
   if(mode==='login'){
    const{error}=await sb.auth.signInWithPassword({email:email.trim(),password});if(error)throw error
   }else{
    if(!name.trim())throw new Error(t('recruit.errorName'))
    const redirect=`${window.location.origin}${window.location.pathname}?app=recruit&invite=${encodeURIComponent(token)}`
    const{data,error}=await sb.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,data:{nombre:name.trim(),tipo:'proveedor'}}})
    if(error)throw error
    if(!data.session)setMessage(t('recruit.confirmEmail'))
   }
  }catch(e){setMessage(e instanceof Error?e.message:t('recruit.linkedError'))}
  finally{setBusy(false)}
 }

 if(loading)return <LoadingScreen label={t('recruit.loading')}/>
 if(invalid||!invite)return <main className="ugo-recruit"><section className="ugo-recruit-invalid"><div className="ugo-recruit-orb">H</div><small>{t('recruit.eyebrow')}</small><h1>{t('recruit.invalidTitle')}</h1><p>{t('recruit.invalidCopy')}</p><button type="button" onClick={()=>window.location.replace(window.location.pathname)}>{t('recruit.back')}</button></section></main>

 if(session&&claimed)return <div className="ugo-recruit-onboarding"><header className="ugo-recruit-minihead"><div className="ugo-recruit-orb">H</div><div><b>{t('recruit.onboardingTitle')}</b><span>{t('recruit.onboardingCopy')}</span></div></header><ProviderOnboardingGate onVerified={()=>window.location.replace(`${window.location.pathname}?app=provider`)}/></div>

 return <main className="ugo-recruit">
  <section className="ugo-recruit-hero"><div className="ugo-recruit-brand"><div className="ugo-recruit-orb">H</div><div><b><LocalizedText id="ugoWebRemaining.brand"/></b><span>{t('recruit.brand')}</span></div></div><div className="ugo-recruit-copy"><small>{t('recruit.personalInvite')}</small><h1>{t('recruit.welcome',{name:invite.nombre})}</h1><p>{t('recruit.intro')}</p><div className="ugo-recruit-badges"><span>🛠️ {invite.categoria}</span><span>📍 {invite.ciudad||t('recruit.yourZone')}</span><span>🔒 {t('recruit.secure')}</span></div></div><div className="ugo-recruit-roadmap">{[['1',t('recruit.step.account')],['2',t('recruit.step.profile')],['3',t('recruit.step.documents')],['4',t('recruit.step.review')],['5',t('recruit.step.ready')]].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</div><aside className="ugo-recruit-hugo"><div className="ugo-recruit-orb">H</div><div><b>Hugo</b><p>{t('recruit.progressCopy')}</p></div></aside></section>
  <section className="ugo-recruit-auth"><header><small>{t('recruit.start')}</small><h2>{mode==='register'?t('recruit.createTitle'):t('recruit.loginTitle')}</h2><p>{t('recruit.nextCopy')}</p></header><div className="ugo-recruit-tabs"><button type="button" className={mode==='register'?'active':''} onClick={()=>{setMode('register');setMessage('')}}>{t('recruit.createTab')}</button><button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setMessage('')}}>{t('recruit.loginTab')}</button></div><form onSubmit={submit}>{mode==='register'&&<label>{t('recruit.name')}<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required/></label>}<label>{t('recruit.email')}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label>{t('recruit.password')}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete={mode==='register'?'new-password':'current-password'} required/></label>{invite.telefono&&<div className="ugo-recruit-prefill"><span>{t('recruit.whatsappFound')}</span><b>{invite.telefono}</b><small>{t('recruit.whatsappHelp')}</small></div>}{message&&<div className="ugo-recruit-message" role="status">{message}</div>}<button type="submit" className="primary" disabled={busy}>{busy?t('recruit.processing'):mode==='register'?t('recruit.createContinue'):t('recruit.loginContinue')}</button></form><p className="ugo-recruit-privacy">{t('recruit.privacy')}</p></section>
 </main>
}

export default ProviderRecruitmentLanding
