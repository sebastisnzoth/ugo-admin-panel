import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'

type AdminPersonal={nombre:string;apellido:string;telefono:string;pais:string;zona:string;endereco:string}
const empty:AdminPersonal={nombre:'',apellido:'',telefono:'',pais:'BR',zona:'',endereco:''}
const labels:Record<keyof AdminPersonal,string>={nombre:'Nombre',apellido:'Apellido',telefono:'Teléfono',pais:'País',zona:'Ciudad / zona',endereco:'Dirección'}

export function AdminMyProfile({onClose}:{onClose:()=>void}){
 const[fields,setFields]=useState<AdminPersonal>(empty),[initial,setInitial]=useState<AdminPersonal>(empty)
 const[email,setEmail]=useState(''),[role,setRole]=useState(''),[lastSignIn,setLastSignIn]=useState('')
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const[password,setPassword]=useState(''),[repeat,setRepeat]=useState('')
 const load=useCallback(async()=>{
  setLoading(true)
  try{
   const{data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw new Error('Sesión administrativa requerida.')
   const{data,error}=await (supabase as any).from('usuarios').select('nombre,apellido,telefono,pais,zona,endereco,tipo,activo').eq('id',user.id).single()
   if(error||!data)throw error||new Error('Perfil Admin no encontrado.')
   if(!data.activo||!['admin','superadmin'].includes(data.tipo))throw new Error('No tenés acceso administrativo.')
   const next=Object.fromEntries(Object.keys(empty).map(key=>[key,String((data as any)[key]??'')])) as AdminPersonal
   setFields(next);setInitial(next);setEmail(user.email||'');setRole(data.tipo);setLastSignIn(user.last_sign_in_at||'')
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo cargar tu perfil.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;setMessage('')
  const base=Object.fromEntries((Object.keys(empty) as (keyof AdminPersonal)[]).filter(key=>fields[key]!==initial[key]).map(key=>[key,fields[key]]))
  if(!Object.keys(base).length)return setMessage('No hay cambios pendientes.')
  setBusy(true)
  try{
   const{data:{session},error:authError}=await supabase.auth.getSession()
   if(authError||!session)throw new Error('Sesión administrativa vencida.')
   const response=await fetch('/api/operations?op=admin-update-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({userId:session.user.id,base,detail:{}})})
   const result=await response.json().catch(()=>({}))
   if(!response.ok||!result.saved)throw new Error(result.error||'No se pudo guardar.')
   setMessage('Datos actualizados y auditados.');await load()
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar tu perfil.')}
  finally{setBusy(false)}
 }
 const updatePassword=async(e:React.FormEvent)=>{
  e.preventDefault();setMessage('')
  if(password.length<8)return setMessage('La contraseña debe tener al menos ocho caracteres.')
  if(password!==repeat)return setMessage('Las contraseñas no coinciden.')
  setBusy(true)
  const{error}=await supabase.auth.updateUser({password})
  setBusy(false)
  if(error)return setMessage(error.message)
  setPassword('');setRepeat('');setMessage('Contraseña actualizada.')
 }
 return <div role="presentation" className="ugo-admin-user-trace-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
 <section role="dialog" aria-modal="true" aria-label="Mi perfil Admin" className="ugo-admin-user-trace">
  <header><div><small>UGO · ADMINISTRACIÓN</small><h2>Mi perfil</h2><p>{email} · {role}</p></div><button type="button" aria-label="Cerrar mi perfil" onClick={onClose}>×</button></header>
  <div style={{padding:20,display:'grid',gap:16}}>
  {lastSignIn&&<p>Último acceso: {new Date(lastSignIn).toLocaleString('es-AR')}</p>}
  {loading?<p>Cargando tus datos…</p>:<form onSubmit={save} style={{display:'grid',gap:12}}>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
    {(Object.keys(empty) as (keyof AdminPersonal)[]).map(key=><label key={key} style={{display:'grid',gap:5}}>{labels[key]}<input value={fields[key]} maxLength={key==='pais'?2:255} onChange={e=>setFields(v=>({...v,[key]:e.target.value}))}/></label>)}
   </div>
   <small>El email, el rol y los permisos no se pueden editar desde Mi perfil.</small>
   <button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar mis datos'}</button>
  </form>}
  <form onSubmit={updatePassword} style={{display:'grid',gap:10}}>
   <strong>Cambiar contraseña</strong>
   <label>Contraseña nueva<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={8} value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>
   <button type="submit" disabled={busy}>Cambiar contraseña</button>
  </form>
  {message&&<p role="status">{message}</p>}
  </div>
 </section></div>
}
