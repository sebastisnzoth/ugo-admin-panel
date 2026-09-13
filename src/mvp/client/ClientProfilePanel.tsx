import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'
import{useClientFlow}from'./clientFlow'
import'./client-profile-panel.css'

type Detail={telefono?:string|null;direccion?:string|null;barrio?:string|null;ciudad?:string|null;idioma_preferido?:string|null;contacto_preferido?:string|null}

export function ClientProfilePanel(){
 const flow=useClientFlow()
 const auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[detail,setDetail]=useState<Detail|null>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{if(!session)return;let alive=true;setLoading(true);supabase.from('perfiles_cliente').select('telefono,direccion,barrio,ciudad,idioma_preferido,contacto_preferido').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(alive){setDetail((data||null)as Detail|null);setLoading(false)}});return()=>{alive=false}},[session,supabase])
 if(!session)return null
 const address=[detail?.direccion,detail?.barrio,detail?.ciudad].filter(Boolean).join(', ')||'Sin dirección cargada'
 return <div className="ugo-client-screen-overlay" role="dialog" aria-modal="true" aria-label="Perfil del cliente">
  <section className="ugo-client-profile-panel">
   <header><button type="button" onClick={()=>flow.navigate('home')} aria-label="Volver">←</button><div><small>U.G.O. · CLIENTE</small><h2>Tu perfil</h2></div><span>{profile?.nombre?.slice(0,1).toUpperCase()||'U'}</span></header>
   {loading?<div className="ugo-client-profile-loading">Cargando perfil…</div>:<div className="ugo-client-profile-body">
    <div className="ugo-client-profile-name"><strong>{profile?.nombre||'Cliente UGO'}</strong><small>{session.user.email||'Sin email'}</small></div>
    <dl><div><dt>Teléfono</dt><dd>{detail?.telefono||'Sin teléfono'}</dd></div><div><dt>Dirección</dt><dd>{address}</dd></div><div><dt>Idioma</dt><dd>{detail?.idioma_preferido||'pt-BR'}</dd></div><div><dt>Contacto preferido</dt><dd>{detail?.contacto_preferido||'WhatsApp'}</dd></div></dl>
    <button type="button" className="ugo-client-profile-primary" onClick={()=>flow.navigate('home')}>Volver a Inicio</button>
    <button type="button" className="ugo-client-profile-signout" onClick={()=>void auth.signOut()}>Cerrar sesión</button>
   </div>}
  </section>
 </div>
}
