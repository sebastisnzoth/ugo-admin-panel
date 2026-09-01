import React,{useEffect,useState}from'react'
import type{FormEvent}from'react'
import{AdminPanel}from'../components/AdminPanel'
import{supabase}from'../lib/supabase'
import{PixReconciliationPanel}from'./PixReconciliationPanel'
import{WhatsAppAdminInbox}from'./WhatsAppAdminInbox'
import{AdminFinancePanel}from'./AdminFinancePanel'

type AdminProfile={tipo:string;activo:boolean}

export function AdminGate(){
 const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[email,setEmail]=useState('demo.admin@ugo.test'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function getAdminProfile(uid:string){const{data,error}=await (supabase as any).from('usuarios').select('tipo,activo').eq('id',uid).maybeSingle();return{profile:(data||null)as AdminProfile|null,error}}
 async function authorizeSession(session:any){if(!session)return false;const{profile,error}=await getAdminProfile(session.user.id);return Boolean(!error&&profile&&profile.activo&&['admin','superadmin'].includes(String(profile.tipo)))}
 async function verify(){const{data:{session}}=await supabase.auth.getSession();if(!session){setAllowed(false);setChecking(false);return}if(await authorizeSession(session))setAllowed(true);else{await supabase.auth.signOut();setAllowed(false);setError('Acceso denegado. Esta cuenta no tiene rol de administrador.')}setChecking(false)}
 useEffect(()=>{verify().catch(()=>{setChecking(false);setAllowed(false)})},[])
 async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const{data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;const session=data.session;if(!session)throw new Error('No se pudo iniciar la sesión.');if(!(await authorizeSession(session))){await supabase.auth.signOut();throw new Error('Acceso denegado. Esta cuenta no tiene rol de administrador.')}setAllowed(true)}catch(x){setError(x instanceof Error?x.message:'No se pudo iniciar sesión.')}finally{setBusy(false)}}
 if(checking)return <div className="mvp-loading"><p>Validando acceso U.G.O.…</p></div>
 if(allowed)return <><AdminPanel/><PixReconciliationPanel/><WhatsAppAdminInbox/><AdminFinancePanel/></>
 return <div className="mvp-auth-page"><div className="mvp-auth-card"><div className="mvp-kicker">U.G.O. · ADMIN</div><h1>Panel de control</h1><p>Solo administradores autorizados.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error&&<div className="mvp-form-error">{error}</div>}<button type="submit" className="mvp-primary" disabled={busy}>{busy?'Validando…':'Ingresar →'}</button></form></div></div>
}
