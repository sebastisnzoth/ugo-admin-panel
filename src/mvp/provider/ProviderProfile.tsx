import React,{useEffect,useState}from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderCategoriesEditor}from'./ProviderCategoriesEditor'
import{ProviderCalendarIntegration}from'./ProviderCalendarIntegration'

const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'PRO'
const verificationLabel=(state?:string)=>state==='verificado'?'Perfil verificado':state==='rechazado'?'Verificación rechazada':state==='suspendido'?'Perfil suspendido':'Verificación pendiente'

export function ProviderProfileScreen(){
 const d=useProviderData(),flow=useProviderFlow(),p=d.provider
 const[editing,setEditing]=useState(false),[bio,setBio]=useState(p.bio||''),[city,setCity]=useState(p.ciudad_base||''),[rate,setRate]=useState(String(p.tarifa_base||'')),[radius,setRadius]=useState(String(p.zona_radio_km||15)),[error,setError]=useState('')
 useEffect(()=>{setBio(p.bio||'');setCity(p.ciudad_base||'');setRate(String(p.tarifa_base||''));setRadius(String(p.zona_radio_km||15))},[p.bio,p.ciudad_base,p.tarifa_base,p.zona_radio_km])
 const save=async(event:React.FormEvent)=>{event.preventDefault();setError('');const tarifa=Number(rate),radio=Number(radius);if(!Number.isFinite(tarifa)||tarifa<0)return setError('Ingresá una tarifa válida.');if(!Number.isFinite(radio)||radio<1||radio>100)return setError('El radio de trabajo debe estar entre 1 y 100 km.');const ok=await d.saveProfile({bio:bio.trim()||null,tarifa_base:tarifa,ciudad_base:city.trim()||null,zona_radio_km:radio});if(ok)setEditing(false)}
 return <section className="provider-screen provider-profile-complete" aria-labelledby="provider-profile-title">
  <header className="provider-section-head"><div><span className="provider-kicker">TU CUENTA</span><h1 id="provider-profile-title">Perfil</h1><p>Tu identidad profesional, operación y dinero en un solo lugar.</p></div><button className="provider-link" type="button" onClick={()=>setEditing(value=>!value)}>{editing?'Cerrar':'Editar'}</button></header>
  <article className="provider-profile-identity">
   <span className="provider-profile-avatar" aria-hidden="true">{initials(d.name)}</span>
   <div><h2>{d.name}</h2><p>⭐ {d.karma.toFixed(1)} · {p.ciudad_base||'Ciudad por completar'}</p><span className="provider-profile-verified">✓ {verificationLabel(p.estado_verificacion)}</span></div>
   <button type="button" className={d.online?'is-online':'is-offline'} onClick={d.toggleOnline} disabled={d.busy} aria-pressed={d.online}>{d.online?'Online':'Offline'}</button>
  </article>
  {editing&&<form className="provider-profile-form provider-card" onSubmit={save}>
   <div className="provider-profile-form-head"><div><small>PERFIL PÚBLICO</small><h2>Información profesional</h2></div><span>Los clientes ven estos datos</span></div>
   <label>Presentación<textarea value={bio} onChange={event=>setBio(event.target.value)} maxLength={600} placeholder="Contá brevemente qué trabajos hacés y tu experiencia."/></label>
   <div className="provider-profile-fields"><label>Ciudad base<input value={city} onChange={event=>setCity(event.target.value)} placeholder="Florianópolis"/></label><label>Radio de trabajo<input type="number" min="1" max="100" value={radius} onChange={event=>setRadius(event.target.value)} inputMode="numeric"/><small>kilómetros</small></label><label>Tarifa base<input type="number" min="0" step="0.01" value={rate} onChange={event=>setRate(event.target.value)} inputMode="decimal"/><small>R$</small></label></div>
   {error&&<p className="provider-profile-error" role="alert">{error}</p>}
   <button className="provider-primary provider-wide" disabled={d.busy}>{d.busy?'Guardando…':'Guardar perfil'}</button>
  </form>}
  <div className="provider-profile-dashboard">
   <button className="provider-profile-tile is-money" type="button" onClick={flow.actions.openEarnings}><span>GANANCIAS</span><strong>Fondos y retiros</strong><small>Saldo, Mercado Pago/PIX e historial →</small></button>
   <button className="provider-profile-tile is-work" type="button" onClick={flow.actions.openHistory}><span>ACTIVIDAD</span><strong>Trabajos realizados</strong><small>Activos, completados y cobros →</small></button>
  </div>
  <div className="provider-settings-list">
   <details className="provider-setting" open><summary><span className="provider-setting-icon">⌁</span><div><strong>Servicios y zona</strong><small>Elegí todos los rubros en los que trabajás</small></div></summary><div className="provider-setting-content"><p>{p.categoria_principal_id?'Tu rubro principal está configurado. Podés sumar otros sin crear otra cuenta.':'Falta configurar tu rubro principal.'}</p><ProviderCategoriesEditor primaryId={p.categoria_principal_id||null} onSaved={d.reload}/><p>{p.ciudad_base||'Ciudad sin definir'} · radio de {p.zona_radio_km||15} km</p><button type="button" onClick={()=>setEditing(true)}>Editar zona y tarifa</button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">✓</span><div><strong>Documentos y verificación</strong><small>{verificationLabel(p.estado_verificacion)}</small></div></summary><div className="provider-setting-content"><p>UGO usa la verificación para proteger al cliente y al profesional. El estado mostrado es el registrado en tu cuenta.</p></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">$</span><div><strong>Cobros y cuenta</strong><small>Mercado Pago, PIX y retiros</small></div></summary><div className="provider-setting-content"><p>Vinculá tu cuenta, revisá el saldo disponible y solicitá retiros desde Ganancias.</p><button type="button" onClick={flow.actions.openEarnings}>Administrar fondos</button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">▣</span><div><strong>Google Calendar</strong><small>Agenda externa opcional · UGO sigue siendo la fuente de verdad</small></div></summary><div className="provider-setting-content"><ProviderCalendarIntegration/></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">●</span><div><strong>Disponibilidad y notificaciones</strong><small>{d.online?'Recibiendo pedidos compatibles':'No estás recibiendo pedidos'}</small></div></summary><div className="provider-setting-content"><p>Las alertas de nuevos pedidos aparecen en UGO. Tu estado Online controla si entrás al radar.</p><button type="button" onClick={d.toggleOnline} disabled={d.busy}>{d.online?'Ponerme Offline':'Ponerme Online'}</button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">?</span><div><strong>Ayuda, seguridad y condiciones</strong><small>Soporte y reglas de uso</small></div></summary><div className="provider-setting-content"><p>Ante un problema con un trabajo, abrí la disputa desde el servicio o revisá la actividad. Nunca compartas contraseñas ni cierres cobros fuera de UGO.</p><button type="button" onClick={flow.actions.openDispute}>Abrir soporte de un servicio</button></div></details>
  </div>
  <button className="provider-signout" type="button" onClick={()=>void d.signOut()} disabled={d.busy}>Cerrar sesión</button>
 </section>
}
