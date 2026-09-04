import React,{useEffect,useState}from'react'
import type{FormEvent}from'react'
import{AdminPanelBridge}from'./AdminPanelBridge'
import{supabase}from'../lib/supabase'
import{PixReconciliationPanel}from'./PixReconciliationPanel'
import{WhatsAppAdminInbox}from'./WhatsAppAdminInbox'

type AdminProfile={tipo:string;activo:boolean}

export function AdminGate(){
 const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[recovery,setRecovery]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 async function getAdminProfile(uid:string){const{data,error}=await (supabase as any).from('usuarios').select('tipo,activo').eq('id',uid).maybeSingle();return{profile:(data||null)as AdminProfile|null,error}}
 async function authorizeSession(session:any){if(!session)return false;const{profile,error}=await getAdminProfile(session.user.id);return Boolean(!error&&profile&&profile.activo&&['admin','superadmin'].includes(String(profile.tipo)))}
 async function verify(){
  const params=new URLSearchParams(window.location.search),code=params.get('code')
  if(code){
   const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code)
   if(exchangeError){setError(exchangeError.message)}else{setRecovery(true);setNotice('Enlace validado. Definí una nueva contraseña para tu cuenta Admin.')}
   const clean=new URL(window.location.href);clean.searchParams.delete('code');window.history.replaceState({},'',clean.toString())
   setChecking(false);return
  }
  const{data:{session}}=await supabase.auth.getSession();if(!session){setAllowed(false);setChecking(false);return}
  if(await authorizeSession(session))setAllowed(true);else{await supabase.auth.signOut();setAllowed(false);setError('Acceso denegado. Esta cuenta no tiene rol de administrador.')}
  setChecking(false)
 }
 useEffect(()=>{verify().catch(()=>{setChecking(false);setAllowed(false)})},[])
 async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{const{data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;const session=data.session;if(!session)throw new Error('No se pudo iniciar la sesión.');if(!(await authorizeSession(session))){await supabase.auth.signOut();throw new Error('Acceso denegado. Esta cuenta no tiene rol de administrador.')}setAllowed(true)}catch(x){setError(x instanceof Error?x.message:'No se pudo iniciar sesión.')}finally{setBusy(false)}}
 async function sendRecovery(){
  const cleanEmail=email.trim();if(!cleanEmail)return setError('Ingresá el email de tu cuenta Admin.')
  setBusy(true);setError('');setNotice('')
  try{const redirectTo=`${window.location.origin}/?app=admin`;const{error}=await supabase.auth.resetPasswordForEmail(cleanEmail,{redirectTo});if(error)throw error;setNotice('Si ese email corresponde a una cuenta UGO, vas a recibir un enlace para crear una nueva contraseña.')}
  catch(x){setError(x instanceof Error?x.message:'No se pudo enviar el enlace de recuperación.')}
  finally{setBusy(false)}
 }
 async function saveNewPassword(e:FormEvent){
  e.preventDefault();if(newPassword.length<8)return setError('La nueva contraseña debe tener al menos 8 caracteres.')
  setBusy(true);setError('');setNotice('')
  try{const{error}=await supabase.auth.updateUser({password:newPassword});if(error)throw error;const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('No se pudo validar la sesión recuperada.');if(!(await authorizeSession(session))){await supabase.auth.signOut();throw new Error('La cuenta recuperada no tiene rol de administrador.')}setRecovery(false);setAllowed(true);setNotice('Contraseña actualizada.')}
  catch(x){setError(x instanceof Error?x.message:'No se pudo actualizar la contraseña.')}
  finally{setBusy(false)}
 }
 if(checking)return <div className="mvp-loading"><p>Validando acceso U.G.O.…</p></div>
 if(allowed)return <><AdminPanelBridge/><PixReconciliationPanel/><WhatsAppAdminInbox/></>
 if(recovery)return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker">U.G.O. · ADMIN</div><h1>Nueva contraseña</h1><p>Definí una contraseña nueva para tu cuenta de administrador.</p><form onSubmit={saveNewPassword}><label>Nueva contraseña<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required/></label>{notice&&<div className="mvp-notice ok">{notice}</div>}{error&&<div className="mvp-form-error">{error}</div>}<button type="submit" className="mvp-primary" disabled={busy}>{busy?'Guardando…':'Guardar contraseña →'}</button></form></div></div>
 return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker">U.G.O. · ADMIN</div><h1>Panel de control</h1><p>Solo administradores autorizados.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="tu-email@dominio.com" required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{notice&&<div className="mvp-notice ok">{notice}</div>}{error&&<div className="mvp-form-error">{error}</div>}<button type="submit" className="mvp-primary" disabled={busy}>{busy?'Validando…':'Ingresar →'}</button><button type="button" className="mvp-secondary" onClick={sendRecovery} disabled={busy}>Olvidé mi contraseña</button></form></div></div>
}
