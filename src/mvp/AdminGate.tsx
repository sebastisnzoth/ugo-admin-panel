import{LanguageSelector}from'../i18n/LanguageSelector'
import React,{lazy,Suspense,useEffect,useState}from'react'
import{useLocale}from'../i18n/locale'
import type{FormEvent}from'react'
import{supabase}from'../lib/supabase'
import'./ugo-dark-premium.css'

const AdminFeatureShell=lazy(()=>import('../features/admin/screens/AdminShell').then((m)=>({default:m.AdminShell})))

type AdminProfile={tipo:string;activo:boolean}
type AdminGateProps={children?:React.ReactNode}

const ADMIN_PROFILE_RETRY_DELAYS=[0,350,900,1800] as const
function transientAdminProfileError(value:unknown){const text=value instanceof Error?value.message:String((value as any)?.message||value||'');return /timeout|timed out|statement timeout|57014|fetch|network|abort|connection|temporar|pgrst/i.test(text)}
async function adminWait(ms:number){if(ms>0)await new Promise(resolve=>window.setTimeout(resolve,ms))}
async function withAdminProfileTimeout<T>(operation:PromiseLike<T>,ms=4500){return await Promise.race([Promise.resolve(operation),new Promise<T>((_,reject)=>window.setTimeout(()=>reject(new Error('ADMIN_PROFILE_QUERY_TIMEOUT')),ms))])}

function resolveAdminLogin(value:string){
  const clean=value.trim()
  return clean.includes('@')?clean.toLowerCase():`${clean.toLowerCase()}@example.com`
}

function adminAuthErrorMessage(error:unknown,t:(key:string)=>string){
  const code=typeof error==='object'&&error&&'code'in error?String((error as {code?:unknown}).code||''):''
  if(code==='invalid_credentials'||code==='email_not_confirmed')return t('adminAuth.invalidCredentials')
  if(code==='over_request_rate_limit')return t('adminAuth.rateLimit')
  return t('adminAuth.loginFailed')
}

export function AdminGate({children}:AdminGateProps={}){
  const gateParams=new URLSearchParams(window.location.search)
  return <SecureAdminGate gateParams={gateParams}>{children}</SecureAdminGate>
}

function SecureAdminGate({children,gateParams}:AdminGateProps&{gateParams:URLSearchParams}){
 const{t}=useLocale();
  const requestedSection=gateParams.get('section')
  const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(false)
  const requestedApp=gateParams.get('app')
  const secureAdminAccess=requestedApp==='admin'&&gateParams.get('auth')==='1'
  const requiresSuperAdmin=requestedSection==='superadmin'||requestedApp==='superadmin'
  const appName=requestedApp==='development'?'development':'admin'
  async function getAdminProfile(uid:string){let lastError:any=null;for(let attempt=0;attempt<ADMIN_PROFILE_RETRY_DELAYS.length;attempt++){await adminWait(ADMIN_PROFILE_RETRY_DELAYS[attempt]);const query=(supabase as any).from('usuarios').select('tipo,activo').eq('id',uid).maybeSingle();const{data,error}=await withAdminProfileTimeout<any>(query,4500);if(!error)return{profile:(data||null)as AdminProfile|null,error:null};lastError=error;if(!transientAdminProfileError(error))break}return{profile:null,error:lastError}} 
  async function authorizeSession(session:any){if(!session)return false;const{profile,error}=await getAdminProfile(session.user.id);if(error)throw error;const allowed=Boolean(profile&&profile.activo&&(requiresSuperAdmin?profile.tipo==='superadmin':['admin','superadmin'].includes(profile.tipo)));if(allowed)await supabase.realtime.setAuth(session.access_token);return allowed}
  async function verify(){
   const params=new URLSearchParams(window.location.search),code=params.get('code')
   if(code){const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError){setError(exchangeError.message)}else{setRecovery(true);setNotice(t('adminAuth.linkValid'))}}
   const{data:{session},error:sessionError}=await supabase.auth.getSession();if(sessionError)throw sessionError;if(!session){setAllowed(false);setChecking(false);return}
   try{if(await authorizeSession(session)){setAllowed(true);setError('')}else{await supabase.auth.signOut();setAllowed(false);setError(requiresSuperAdmin?t('adminAuth.noSuperAdmin'):t('adminAuth.noAdmin'))}}catch(profileError){setAllowed(false);setError(transientAdminProfileError(profileError)?t('adminAuth.sessionAdmin'):profileError instanceof Error?profileError.message:t('adminAuth.profileAdmin'))}setChecking(false)
  }
  useEffect(()=>{verify().catch(()=>{setChecking(false);setAllowed(false);setError(t('adminAuth.sessionInvalid'))})},[])
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{const email=resolveAdminLogin(identifier);const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(data.session){try{if(await authorizeSession(data.session)){setAllowed(true);setChecking(false);setError('')}else{await supabase.auth.signOut();setAllowed(false);setError(requiresSuperAdmin?t('adminAuth.noSuperAdmin'):t('adminAuth.noAdmin'))}}catch(profileError){setAllowed(false);setError(transientAdminProfileError(profileError)?t('adminAuth.sessionAdmin'):profileError instanceof Error?profileError.message:t('adminAuth.profileAdmin'))}}}catch(err:unknown){setError(adminAuthErrorMessage(err,t))}finally{setBusy(false)}}
  async function sendRecovery(){const cleanIdentifier=identifier.trim();if(!cleanIdentifier)return setError(t('adminAuth.needIdentifier'));if(!cleanIdentifier.includes('@'))return setError(t('adminAuth.validEmail'));setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.resetPasswordForEmail(cleanIdentifier,{redirectTo:window.location.origin+window.location.pathname+`?app=${appName}${secureAdminAccess||requiresSuperAdmin?'&auth=1':''}${requiresSuperAdmin?'&section=superadmin&tab=autonomy':''}`});if(error)throw error;setNotice(t('adminAuth.recoverySent'))}catch(err:any){setError(err?.message||t('adminAuth.recoveryFailed'))}finally{setBusy(false)}}
  async function saveNewPassword(e:FormEvent){e.preventDefault();if(newPassword.length<8)return setError(t('adminAuth.passwordShort'));setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.updateUser({password:newPassword});if(error)throw error;setRecovery(false);setNotice(t('adminAuth.passwordUpdated'))}catch(err:any){setError(err?.message||t('adminAuth.passwordUpdateFailed'))}finally{setBusy(false)}}
  if(checking)return <div className="mvp-loading" role="status" aria-live="polite"><p>{t('adminAuth.checking')}</p></div>
  if(allowed)return children?<>{children}</>:<Suspense fallback={<div style={{padding:24}}>{t('adminAuth.loading')}</div>}><AdminFeatureShell /></Suspense>
  if(recovery)return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker ugo-admin-login-kicker" style={{color:'#fff',background:'#000',display:'inline-block',padding:'4px 6px',borderRadius:6}}>{t('adminAuth.brand')}</div><h1>{t('adminAuth.newPassword')}</h1><p>{t('adminAuth.setPassword')}</p><form onSubmit={saveNewPassword}><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder={t('adminAuth.newPasswordPlaceholder')} aria-label={t('adminAuth.newPasswordPlaceholder')}/><button type="submit" disabled={busy}>{busy?t('adminAuth.savingPassword'):t('adminAuth.savePassword')}</button></form>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
  return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker ugo-admin-login-kicker" style={{color:'#fff',background:'#000',display:'inline-block',padding:'4px 6px',borderRadius:6}}>U.GO · ADMIN</div><h1>{appName==='development'?t('adminAuth.development'):requiresSuperAdmin?t('adminAuth.superadmin'):t('adminAuth.controlPanel')}</h1><p>{t('adminAuth.adminOnly')}</p><LanguageSelector/><form onSubmit={login}><input type="text" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder={t('adminAuth.identifier')} aria-label={t('adminAuth.identifier')} inputMode="email" autoComplete="username"/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={t('adminAuth.password')} aria-label={t('adminAuth.password')} autoComplete="current-password"/><button type="submit" disabled={busy}>{busy?t('adminAuth.signingIn'):t('adminAuth.signIn')}</button></form><button type="button" className="mvp-link" onClick={sendRecovery}>{t('adminAuth.recover')}</button>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
}
