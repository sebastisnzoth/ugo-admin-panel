import React,{useEffect,useState}from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderCategoriesEditor}from'./ProviderCategoriesEditor'
import{ProviderCalendarIntegration}from'./ProviderCalendarIntegration'
import{Button,Card,Input,SectionHeader,StatusPill,Textarea}from'../../shared/ui'

const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'PRO'
const verificationLabel=(state?:string)=>state==='verificado'?'Perfil verificado':state==='rechazado'?'Verificación rechazada':state==='suspendido'?'Perfil suspendido':'Verificación pendiente'

export function ProviderProfileScreen(){
 const d=useProviderData(),flow=useProviderFlow(),p=d.provider
 const[editing,setEditing]=useState(false),[bio,setBio]=useState(p.bio||''),[city,setCity]=useState(p.ciudad_base||''),[rate,setRate]=useState(String(p.tarifa_base||'')),[radius,setRadius]=useState(String(p.zona_radio_km||15)),[error,setError]=useState('')
 useEffect(()=>{setBio(p.bio||'');setCity(p.ciudad_base||'');setRate(String(p.tarifa_base||''));setRadius(String(p.zona_radio_km||15))},[p.bio,p.ciudad_base,p.tarifa_base,p.zona_radio_km])
 const save=async(event:React.FormEvent)=>{event.preventDefault();setError('');const tarifa=Number(rate),radio=Number(radius);if(!Number.isFinite(tarifa)||tarifa<0)return setError('Ingresá una tarifa válida.');if(!Number.isFinite(radio)||radio<1||radio>100)return setError('El radio de trabajo debe estar entre 1 y 100 km.');const ok=await d.saveProfile({bio:bio.trim()||null,tarifa_base:tarifa,ciudad_base:city.trim()||null,zona_radio_km:radio});if(ok)setEditing(false)}
 return <section className="provider-screen provider-profile-complete" aria-labelledby="provider-profile-title">
  <SectionHeader eyebrow="TU CUENTA" title="Perfil" description="Tu identidad profesional, operación y dinero en un solo lugar." actions={<Button variant="ghost" onClick={()=>setEditing(value=>!value)}>{editing?'Cerrar':'Editar'}</Button>}/>
  <article className="provider-profile-identity">
   <span className="provider-profile-avatar" aria-hidden="true">{initials(d.name)}</span>
   <div><h2>{d.name}</h2><p>⭐ {d.karma.toFixed(1)} · {p.ciudad_base||'Ciudad por completar'}</p><StatusPill tone={p.estado_verificacion==='verificado'?'success':p.estado_verificacion==='rechazado'||p.estado_verificacion==='suspendido'?'danger':'warning'}>✓ {verificationLabel(p.estado_verificacion)}</StatusPill></div>
   <Button variant={d.online?'primary':'secondary'} className={d.online?'is-online':'is-offline'} onClick={d.toggleOnline} disabled={d.busy} aria-pressed={d.online}>{d.online?'Online':'Offline'}</Button>
  </article>
  {editing&&<form className="provider-profile-form provider-card ugo-ui-card" onSubmit={save}>
   <div className="provider-profile-form-head"><div><small>PERFIL PÚBLICO</small><h2>Información profesional</h2></div><span>Los clientes ven estos datos</span></div>
   <label>Presentación<Textarea value={bio} onChange={event=>setBio(event.target.value)} maxLength={600} placeholder="Contá brevemente qué trabajos hacés y tu experiencia."/></label>
   <div className="provider-profile-fields"><label>Ciudad base<Input value={city} onChange={event=>setCity(event.target.value)} placeholder="Florianópolis"/></label><label>Radio de trabajo<Input type="number" min="1" max="100" value={radius} onChange={event=>setRadius(event.target.value)} inputMode="numeric"/><small>kilómetros</small></label><label>Tarifa base<Input type="number" min="0" step="0.01" value={rate} onChange={event=>setRate(event.target.value)} inputMode="decimal"/><small>R$</small></label></div>
   {error&&<p className="provider-profile-error" role="alert">{error}</p>}
   <Button variant="primary" className="provider-primary provider-wide" disabled={d.busy}>{d.busy?'Guardando…':'Guardar perfil'}</Button>
  </form>}
  <div className="provider-profile-dashboard">
   <button className="provider-profile-tile is-money" type="button" onClick={flow.actions.openEarnings}><span>GANANCIAS</span><strong>Fondos y retiros</strong><small>Saldo, Mercado Pago/PIX e historial →</small></button>
   <button className="provider-profile-tile is-work" type="button" onClick={flow.actions.openHistory}><span>ACTIVIDAD</span><strong>Trabajos realizados</strong><small>Activos, completados y cobros →</small></button>
  </div>
  <div className="provider-settings-list">
   <details className="provider-setting"><summary><span className="provider-setting-icon">⌁</span><div><strong>Servicios y zona</strong><small>Elegí todos los rubros en los que trabajás</small></div></summary><div className="provider-setting-content"><p>{p.categoria_principal_id?'Tu rubro principal está configurado. Podés sumar otros sin crear otra cuenta.':'Falta configurar tu rubro principal.'}</p><ProviderCategoriesEditor primaryId={p.categoria_principal_id||null} onSaved={d.reload}/><p>{p.ciudad_base||'Ciudad sin definir'} · radio de {p.zona_radio_km||15} km</p><Button variant="ghost" onClick={()=>setEditing(true)}>Editar zona y tarifa</Button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">✓</span><div><strong>Documentos y verificación</strong><small>{verificationLabel(p.estado_verificacion)}</small></div></summary><div className="provider-setting-content"><p>UGO usa la verificación para proteger al cliente y al profesional. El estado mostrado es el registrado en tu cuenta.</p></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">$</span><div><strong>Cobros y cuenta</strong><small>Mercado Pago, PIX y retiros</small></div></summary><div className="provider-setting-content"><p>Vinculá tu cuenta, revisá el saldo disponible y solicitá retiros desde Ganancias.</p><Button variant="ghost" onClick={flow.actions.openEarnings}>Administrar fondos</Button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">▣</span><div><strong>Google Calendar</strong><small>Agenda externa opcional · UGO sigue siendo la fuente de verdad</small></div></summary><div className="provider-setting-content"><ProviderCalendarIntegration/></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">●</span><div><strong>Disponibilidad y notificaciones</strong><small>{d.online?'Recibiendo pedidos compatibles':'No estás recibiendo pedidos'}</small></div></summary><div className="provider-setting-content"><p>Las alertas de nuevos pedidos aparecen en UGO. Tu estado Online controla si entrás al radar.</p><Button variant="ghost" onClick={d.toggleOnline} disabled={d.busy}>{d.online?'Ponerme Offline':'Ponerme Online'}</Button></div></details>
   <details className="provider-setting"><summary><span className="provider-setting-icon">?</span><div><strong>Ayuda, seguridad y condiciones</strong><small>Soporte y reglas de uso</small></div></summary><div className="provider-setting-content"><p>Ante un problema con un trabajo, abrí la disputa desde el servicio o revisá la actividad. Nunca compartas contraseñas ni cierres cobros fuera de UGO.</p><Button variant="ghost" onClick={()=>flow.actions.openDispute()}>Abrir soporte de un servicio</Button></div></details>
  </div>
  <Button variant="ghost" className="provider-signout" onClick={()=>void d.signOut()} disabled={d.busy}>Cerrar sesión</Button>
 </section>
}
