import React,{lazy,Suspense,useEffect,useState}from'react'
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

function adminAuthErrorMessage(error:unknown){
  const code=typeof error==='object'&&error&&'code'in error?String((error as {code?:unknown}).code||''):''
  if(code==='invalid_credentials'||code==='email_not_confirmed')return 'Usuario/email o contraseña incorrectos. Verificá los datos e intentá nuevamente.'
  if(code==='over_request_rate_limit')return 'Demasiados intentos seguidos. Esperá un momento y volvé a intentar.'
  return 'No pudimos iniciar sesión de administrador. Verificá tu conexión e intentá nuevamente.'
}

export function AdminGate({children}:AdminGateProps={}){
  const gateParams=new URLSearchParams(window.location.search)
  const requestedSection=gateParams.get('section')
  const publicDevelopmentAccess=gateParams.get('app')==='admin'&&gateParams.get('auth')!=='1'&&requestedSection!=='superadmin'
  if(publicDevelopmentAccess)return children?<>{children}</>:<Suspense fallback={<div style={{padding:24}}>Cargando panel admin…</div>}><AdminFeatureShell /></Suspense>
  const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(false)
  const requestedApp=gateParams.get('app')
  const secureAdminAccess=requestedApp==='admin'&&gateParams.get('auth')==='1'
  const requiresSuperAdmin=requestedSection==='superadmin'||requestedApp==='superadmin'
  const appName=requestedApp==='development'?'development':'admin'
  async function getAdminProfile(uid:string){let lastError:any=null;for(let attempt=0;attempt<ADMIN_PROFILE_RETRY_DELAYS.length;attempt++){await adminWait(ADMIN_PROFILE_RETRY_DELAYS[attempt]);const query=(supabase as any).from('usuarios').select('tipo,activo').eq('id',uid).maybeSingle();const{data,error}=await withAdminProfileTimeout<any>(query,4500);if(!error)return{profile:(data||null)as AdminProfile|null,error:null};lastError=error;if(!transientAdminProfileError(error))break}return{profile:null,error:lastError}} 
  async function authorizeSession(session:any){if(!session)return false;const{profile,error}=await getAdminProfile(session.user.id);if(error)throw error;const allowed=Boolean(profile&&profile.activo&&(requiresSuperAdmin?profile.tipo==='superadmin':['admin','superadmin'].includes(profile.tipo)));if(allowed)await supabase.realtime.setAuth(session.access_token);return allowed}
  async function verify(){
   const params=new URLSearchParams(window.location.search),code=params.get('code')
   if(code){const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError){setError(exchangeError.message)}else{setRecovery(true);setNotice('Enlace validado. Definí una nueva contraseña para continuar.')}}
   const{data:{session},error:sessionError}=await supabase.auth.getSession();if(sessionError)throw sessionError;if(!session){setAllowed(false);setChecking(false);return}
   try{if(await authorizeSession(session)){setAllowed(true);setError('')}else{await supabase.auth.signOut();setAllowed(false);setError(requiresSuperAdmin?'Acceso denegado. Esta cuenta no tiene rol Super Admin activo.':'Acceso denegado. Esta cuenta no tiene rol de administrador.')}}catch(profileError){setAllowed(false);setError(transientAdminProfileError(profileError)?'Tu sesión Admin está activa, pero UGO está tardando en cargar el perfil. Reintentá en unos segundos.':profileError instanceof Error?profileError.message:'No pudimos validar el perfil Admin.')}setChecking(false)
  }
  useEffect(()=>{verify().catch(()=>{setChecking(false);setAllowed(false);setError('No pudimos validar tu sesión de administrador. Tus datos no cambiaron; reintentá ingresando nuevamente.')})},[])
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{const email=resolveAdminLogin(identifier);const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(data.session){try{if(await authorizeSession(data.session)){setAllowed(true);setChecking(false);setError('')}else{await supabase.auth.signOut();setAllowed(false);setError(requiresSuperAdmin?'Acceso denegado. La cuenta no tiene privilegios Super Admin.':'Acceso denegado. La cuenta no tiene privilegios de administrador.')}}catch(profileError){setAllowed(false);setError(transientAdminProfileError(profileError)?'Login aceptado. UGO está recuperando la conexión con tu perfil Admin; tu sesión sigue activa. Reintentá en unos segundos.':profileError instanceof Error?profileError.message:'No pudimos cargar tu perfil Admin.')}}}catch(err:unknown){setError(adminAuthErrorMessage(err))}finally{setBusy(false)}}
  async function sendRecovery(){const cleanIdentifier=identifier.trim();if(!cleanIdentifier)return setError('Ingresá el usuario o email de tu cuenta Admin.');if(!cleanIdentifier.includes('@'))return setError('Ingresá un email válido para recuperar tu contraseña.');setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.resetPasswordForEmail(cleanIdentifier,{redirectTo:window.location.origin+window.location.pathname+`?app=${appName}${secureAdminAccess?'&auth=1':''}`});if(error)throw error;setNotice('Se envió el enlace de recuperación. Revisá tu correo.')}catch(err:any){setError(err?.message||'No pudimos enviar la recuperación.')}finally{setBusy(false)}}
  async function saveNewPassword(e:FormEvent){e.preventDefault();if(newPassword.length<8)return setError('La nueva contraseña debe tener al menos 8 caracteres.');setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.updateUser({password:newPassword});if(error)throw error;setRecovery(false);setNotice('Contraseña actualizada. Podés volver a ingresar.')}catch(err:any){setError(err?.message||'No pudimos actualizar la contraseña.')}finally{setBusy(false)}}
  if(checking)return <div className="mvp-loading" role="status" aria-live="polite"><p>Validando acceso U.G.O.…</p></div>
  if(allowed)return children?<>{children}</>:<Suspense fallback={<div style={{padding:24}}>Cargando panel admin…</div>}><AdminFeatureShell /></Suspense>
  if(recovery)return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker ugo-admin-login-kicker" style={{color:'#fff',background:'#000',display:'inline-block',padding:'4px 6px',borderRadius:6}}>U.G.O. · ADMIN</div><h1>Nueva contraseña</h1><p>Definí una contraseña nueva para tu acceso de administrador.</p><form onSubmit={saveNewPassword}><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="Nueva contraseña" aria-label="Nueva contraseña"/><button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button></form>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
  return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker ugo-admin-login-kicker" style={{color:'#fff',background:'#000',display:'inline-block',padding:'4px 6px',borderRadius:6}}>U.GO · ADMIN</div><h1>{appName==='development'?'Desarrollo UGO':appName==='superadmin'?'Super Admin':'Panel de control'}</h1><p>Solo administradores con sesión activa pueden acceder a este panel.</p><form onSubmit={login}><input type="text" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="Usuario o email" aria-label="Usuario o email" inputMode="email" autoComplete="username"/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Contraseña" aria-label="Contraseña" autoComplete="current-password"/><button type="submit" disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form><button type="button" className="mvp-link" onClick={sendRecovery}>Recuperar contraseña</button>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
}
