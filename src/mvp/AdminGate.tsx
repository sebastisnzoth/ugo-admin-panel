import React,{lazy,Suspense,useEffect,useState}from'react'
import type{FormEvent}from'react'
import{supabase}from'../lib/supabase'
import'./ugo-dark-premium.css'

const AdminFeatureShell=lazy(()=>import('../features/admin/screens/AdminShell').then((m)=>({default:m.AdminShell})))

type AdminProfile={tipo:string;activo:boolean}
type AdminGateProps={children?:React.ReactNode}

function resolveAdminLogin(value:string){
  const clean=value.trim()
  return clean.includes('@')?clean.toLowerCase():`${clean.toLowerCase()}@example.com`
}

export function AdminGate({children}:AdminGateProps={}){
  const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(false)
  const appName=new URLSearchParams(window.location.search).get('app')==='development'?'development':'admin'
  async function getAdminProfile(uid:string){const{data,error}=await (supabase as any).from('usuarios').select('tipo,activo').eq('id',uid).maybeSingle();return{profile:(data||null)as AdminProfile|null,error}} 
  async function authorizeSession(session:any){if(!session)return false;const{profile,error}=await getAdminProfile(session.user.id);return Boolean(!error&&profile&&profile.activo&&['admin','superadmin'].includes(profile.tipo))}
  async function verify(){
   const params=new URLSearchParams(window.location.search),code=params.get('code')
   if(code){const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError){setError(exchangeError.message)}else{setRecovery(true);setNotice('Enlace validado. Definí una nueva contraseña para continuar.')}}
   const{data:{session},error:sessionError}=await supabase.auth.getSession();if(sessionError)throw sessionError;if(!session){setAllowed(false);setChecking(false);return}
   if(await authorizeSession(session))setAllowed(true);else{await supabase.auth.signOut();setAllowed(false);setError('Acceso denegado. Esta cuenta no tiene rol de administrador.')}setChecking(false)
  }
  useEffect(()=>{verify().catch(()=>{setChecking(false);setAllowed(false);setError('No pudimos validar tu sesión de administrador. Tus datos no cambiaron; reintentá ingresando nuevamente.')})},[])
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{const email=resolveAdminLogin(identifier);const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(data.session&&await authorizeSession(data.session)){setAllowed(true);setChecking(false);setError('')}else{await supabase.auth.signOut();setAllowed(false);setError('Acceso denegado. La cuenta no tiene privilegios de administrador.')}}catch(err:any){setError(err?.message||'No pudimos iniciar sesión con estas credenciales.')}finally{setBusy(false)}}
  async function sendRecovery(){const cleanIdentifier=identifier.trim();if(!cleanIdentifier)return setError('Ingresá el usuario o email de tu cuenta Admin.');if(!cleanIdentifier.includes('@'))return setError('Ingresá un email válido para recuperar tu contraseña.');setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.resetPasswordForEmail(cleanIdentifier,{redirectTo:window.location.origin+window.location.pathname+'?app=admin'});if(error)throw error;setNotice('Se envió el enlace de recuperación. Revisá tu correo.')}catch(err:any){setError(err?.message||'No pudimos enviar la recuperación.')}finally{setBusy(false)}}
  async function saveNewPassword(e:FormEvent){e.preventDefault();if(newPassword.length<8)return setError('La nueva contraseña debe tener al menos 8 caracteres.');setBusy(true);setError('');setNotice('');try{const{error}=await supabase.auth.updateUser({password:newPassword});if(error)throw error;setRecovery(false);setNotice('Contraseña actualizada. Podés volver a ingresar.')}catch(err:any){setError(err?.message||'No pudimos actualizar la contraseña.')}finally{setBusy(false)}}
  if(checking)return <div className="mvp-loading" role="status" aria-live="polite"><p>Validando acceso U.G.O.…</p></div>
  if(allowed)return children?<>{children}</>:<Suspense fallback={<div style={{padding:24}}>Cargando panel admin…</div>}><AdminFeatureShell /></Suspense>
  if(recovery)return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker">U.G.O. · ADMIN</div><h1>Nueva contraseña</h1><p>Definí una contraseña nueva para tu acceso de administrador.</p><form onSubmit={saveNewPassword}><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="Nueva contraseña"/><button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button></form>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
  return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker">U.GO · ADMIN</div><h1>{appName==='development'?'Desarrollo UGO':'Panel de control'}</h1><p>Solo administradores con sesión activa pueden acceder a este panel.</p><form onSubmit={login}><input type="text" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="Usuario o email" inputMode="email"/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Contraseña"/><button type="submit" disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form><button type="button" className="mvp-link" onClick={sendRecovery}>Recuperar contraseña</button>{error&&<p className="mvp-error" role="alert">{error}</p>}{notice&&<p className="mvp-notice">{notice}</p>}</div></div>
}
