import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { getRoleSupabase, type UgoRole } from '../lib/roleSupabase'

export type Category = { id:string; slug:string; nombre:string; emoji:string }
export type UgoUser = { id:string; nombre:string; tipo:'cliente'|'proveedor'|'admin'|'superadmin'; activo:boolean; karma:number; servicios_completados:number }
export type ProviderProfile = { usuario_id:string; bio:string|null; tarifa_base:number; online:boolean; disponible:boolean; categoria_principal_id:string|null; estado_verificacion:string }
export type Service = { id:string; numero:number; cliente_id:string; proveedor_id:string|null; categoria_id:string; estado:string; descripcion:string; urgencia:boolean; direccion_cliente:string|null; tarifa:number|null; comision_ugo:number|null; ganancia_proveedor:number|null; moneda:string; created_at:string; updated_at:string; categoria?:{nombre:string;emoji:string}|null; proveedor?:{nombre:string;karma:number}|null; cliente?:{nombre:string}|null }
export type Offer = { id:string; servicio_id:string; proveedor_id:string; estado:string; ranking:number|null; distancia_km:number|null; tarifa_ofrecida:number|null; expira_at:string|null; servicio?:Service|null }
export type Payment = { id:string; servicio_id:string; monto_bruto:number; comision_ugo:number; ganancia_proveedor:number; moneda:string; estado:string }
export type Notice = { type:'ok'|'error'|'info'; text:string } | null

export const ACTIVE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']
export const PROVIDER_ACTIVE_STATES=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']
export const STATUS_ORDER=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado']
export const STATUS_LABELS:Record<string,string>={borrador:'Borrador',buscando:'Buscando profesionales',ofrecido:'Ofertas enviadas',asignado:'Profesional asignado',en_camino:'En camino',llegado:'Proveedor en el lugar',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado',disputado:'En disputa',pendiente:'Pendiente',autorizado:'Autorizado',retenido:'Retenido',liberado:'Liberado',reembolsado:'Reembolsado',fallido:'Fallido'}
export const money=(value:number|null|undefined,currency='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(Number(value||0))
export function timeAgo(value:string){const m=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/60000));if(m<1)return'ahora';if(m<60)return`hace ${m} min`;const h=Math.round(m/60);return h<24?`hace ${h} h`:new Date(value).toLocaleDateString('es-AR')}
export function go(app:'client'|'provider'|'admin'|'home'){window.location.href=app==='home'?window.location.pathname:`${window.location.pathname}?app=${app}`}
const OAUTH_ROLE_KEY='ugo-oauth-intended-role'

/** Shared UGO Design System primitives. Keep screen composition in feature modules. */
const joinClasses=(...classes:Array<string|false|undefined>)=>classes.filter(Boolean).join(' ')
export type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'success'|'danger';loading?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(function Button({variant='primary',loading=false,disabled,children,className,...props},ref){return <button ref={ref} className={joinClasses('ugo-ds-button',variant,className)} disabled={disabled||loading} aria-busy={loading||undefined} {...props}>{loading?'Procesando…':children}</button>})
export type IconButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{label:string}
export const IconButton=React.forwardRef<HTMLButtonElement,IconButtonProps>(function IconButton({label,children,className,...props},ref){return <button ref={ref} type="button" className={joinClasses('ugo-ds-icon-button',className)} aria-label={label} {...props}>{children}</button>})
export const Input=React.forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input({className,...props},ref){return <input ref={ref} className={joinClasses('ugo-ds-field',className)} {...props}/>} )
export type SearchProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'> & {onClear?:()=>void; searchLabel?:string}
export const Search=React.forwardRef<HTMLInputElement,SearchProps>(function Search({onClear,searchLabel='Buscar',value,defaultValue,className,...props},ref){const hasValue=String(value??defaultValue??'').length>0;return <div className={joinClasses('ugo-ds-search',className)} role="search"><span aria-hidden="true">⌕</span><input ref={ref} type="search" aria-label={searchLabel} value={value} defaultValue={defaultValue} {...props}/>{hasValue&&onClear?<IconButton label="Limpiar búsqueda" onClick={onClear}>×</IconButton>:null}</div>})
export const Card=React.forwardRef<HTMLDivElement,HTMLAttributes<HTMLDivElement>>(function Card({className,...props},ref){return <div ref={ref} className={joinClasses('ugo-ds-card',className)} {...props}/>})
export type BadgeProps=HTMLAttributes<HTMLSpanElement>&{variant?:'success'|'warning'|'error'}
export function Badge({variant='success',className,...props}:BadgeProps){return <span className={joinClasses('ugo-ds-badge',variant&&`ugo-ds-status ${variant}`,className)} {...props}/>}
export type AvatarProps=HTMLAttributes<HTMLDivElement>&{name?:string;src?:string;alt?:string}
export function Avatar({name='',src,alt=name,className,...props}:AvatarProps){const initials=name.trim().split(/\s+/).map(part=>part[0]).filter(Boolean).slice(0,2).join('').toUpperCase();return <div className={joinClasses('ugo-ds-avatar',className)} role={src?'img':undefined} aria-label={src?alt:undefined} {...props}>{src?<img src={src} alt={alt}/>:initials||'UG'}</div>}
export type TopBarProps=HTMLAttributes<HTMLElement>&{title?:string;leading?:React.ReactNode;actions?:React.ReactNode}
export function TopBar({title,leading,actions,children,className,...props}:TopBarProps){return <header className={joinClasses('ugo-ds-topbar',className)} {...props}>{leading}<div className="ugo-ds-topbar-title">{title}</div>{children}<div className="ugo-ds-topbar-actions">{actions}</div></header>}
export type BottomNavigationItem={id:string;label:string;icon?:React.ReactNode}
export function BottomNavigation({items,active,onChange,className}:{items:BottomNavigationItem[];active?:string;onChange?:(id:string)=>void;className?:string}){return <nav className={joinClasses('ugo-ds-bottom-nav',className)} aria-label="Navegación principal">{items.map(item=><button key={item.id} type="button" className={item.id===active?'active':undefined} aria-current={item.id===active?'page':undefined} onClick={()=>onChange?.(item.id)}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>}
export function BottomSheet({open,title,onClose,children,className}:{open:boolean;title?:string;onClose:()=>void;children:React.ReactNode;className?:string}){if(!open)return null;return <div className="ugo-ds-sheet-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className={joinClasses('ugo-ds-bottom-sheet','ugo-ds-sheet',className)} role="dialog" aria-modal="true" aria-label={title||'Panel'} onMouseDown={event=>event.stopPropagation()}><div className="ugo-ds-sheet-handle" aria-hidden="true"/>{title&&<div className="ugo-ds-sheet-header"><h2>{title}</h2><IconButton label="Cerrar panel" onClick={onClose}>×</IconButton></div>}{children}</section></div>}
export function Drawer({open,title,side='left',onClose,children,className}:{open:boolean;title?:string;side?:'left'|'right';onClose:()=>void;children:React.ReactNode;className?:string}){if(!open)return null;return <div className="ugo-ds-drawer-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className={joinClasses('ugo-ds-drawer',`side-${side}`,className)} role="dialog" aria-modal="true" aria-label={title||'Menú'} onMouseDown={event=>event.stopPropagation()}>{title&&<div className="ugo-ds-drawer-header"><h2>{title}</h2><IconButton label="Cerrar menú" onClick={onClose}>×</IconButton></div>}{children}</aside></div>}
export function Modal({open,title,onClose,children,className}:{open:boolean;title:string;onClose:()=>void;children:React.ReactNode;className?:string}){if(!open)return null;return <div className="ugo-ds-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className={joinClasses('ugo-ds-modal',className)} role="dialog" aria-modal="true" aria-labelledby="ugo-ds-modal-title" onMouseDown={event=>event.stopPropagation()}><div className="ugo-ds-modal-header"><h2 id="ugo-ds-modal-title">{title}</h2><IconButton label="Cerrar ventana" onClick={onClose}>×</IconButton></div>{children}</section></div>}
export type FloatingActionButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{label:string}
export const FloatingActionButton=React.forwardRef<HTMLButtonElement,FloatingActionButtonProps>(function FloatingActionButton({label,children,...props},ref){return <button ref={ref} type="button" className="ugo-ds-fab" aria-label={label} {...props}>{children}</button>})
export type GlobalStateProps={title?:string;description?:string;actionLabel?:string;onAction?:()=>void;className?:string}
function GlobalState({kind,title,description,actionLabel,onAction,className}:GlobalStateProps&{kind:'empty'|'error'|'retry'|'success';}){return <section className={joinClasses('ugo-ds-state',`ugo-ds-state-${kind}`,className)} role={kind==='error'?'alert':'status'}><span className="ugo-ds-state-icon" aria-hidden="true">{kind==='error'?'!':kind==='success'?'✓':kind==='retry'?'↻':'○'}</span>{title&&<h2>{title}</h2>}{description&&<p>{description}</p>}{actionLabel&&onAction&&<Button variant={kind==='error'?'danger':'primary'} onClick={onAction}>{actionLabel}</Button>}</section>}
export function EmptyState(props:GlobalStateProps){return <GlobalState kind="empty" title={props.title||'No hay información todavía'} description={props.description||'Cuando haya novedades, las vas a ver acá.'} {...props}/>}
export function ErrorState(props:GlobalStateProps){return <GlobalState kind="error" title={props.title||'No pudimos cargar la información'} description={props.description||'Revisá tu conexión e intentá nuevamente.'} actionLabel={props.actionLabel||'Reintentar'} {...props}/>}
export function RetryState(props:GlobalStateProps){return <GlobalState kind="retry" title={props.title||'Intentá nuevamente'} description={props.description} actionLabel={props.actionLabel||'Reintentar'} {...props}/>}
export function SuccessState(props:GlobalStateProps){return <GlobalState kind="success" title={props.title||'Listo'} description={props.description} {...props}/>}
export function OfflineState({onAction,className}:{onAction?:()=>void;className?:string}){return <div className={joinClasses('ugo-ds-offline',className)} role="status"><span aria-hidden="true">⌁</span><span>Estás sin conexión. Guardamos los cambios para sincronizarlos al volver.</span>{onAction&&<button type="button" onClick={onAction}>Reintentar</button>}</div>}

export function useRoleSession(role:UgoRole){
  const supabase=useMemo(()=>getRoleSupabase(role),[role]);const[session,setSession]=useState<Session|null>(null);const[profile,setProfile]=useState<UgoUser|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
  const loadProfile=useCallback(async(next:Session|null)=>{if(!next){setProfile(null);return}let{data,error:e}=await supabase.from('usuarios').select('id,nombre,tipo,activo,karma,servicios_completados').eq('id',next.user.id).maybeSingle();if(e)throw e;if(!data)throw new Error('No se encontró el perfil conectado a esta cuenta.');if(!data.activo){await supabase.auth.signOut();throw new Error('Esta cuenta está desactivada. Contactá a UGO si necesitás revisión.')}const expected=role==='client'?'cliente':'proveedor';const pendingRole=window.localStorage.getItem(OAUTH_ROLE_KEY);const isFreshOAuthUser=Date.now()-new Date(next.user.created_at).getTime()<120000;if(role==='provider'&&data.tipo==='cliente'&&pendingRole==='proveedor'&&isFreshOAuthUser){const{error:updateError}=await supabase.from('usuarios').update({tipo:'proveedor'}).eq('id',next.user.id);if(updateError)throw updateError;const{error:providerError}=await supabase.from('perfiles_proveedor').upsert({usuario_id:next.user.id},{onConflict:'usuario_id'});if(providerError)throw providerError;const refreshed=await supabase.from('usuarios').select('id,nombre,tipo,activo,karma,servicios_completados').eq('id',next.user.id).single();if(refreshed.error)throw refreshed.error;data=refreshed.data}if(data.tipo!==expected){window.localStorage.removeItem(OAUTH_ROLE_KEY);await supabase.auth.signOut();throw new Error(`Esta cuenta está registrada como ${data.tipo}. Abrí la aplicación correspondiente.`)}window.localStorage.removeItem(OAUTH_ROLE_KEY);setProfile(data as UgoUser)},[role,supabase])
  useEffect(()=>{let active=true;supabase.auth.getSession().then(async({data})=>{if(!active)return;try{setSession(data.session);await loadProfile(data.session)}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la sesión.')}finally{if(active)setLoading(false)}});const{data:l}=supabase.auth.onAuthStateChange((_event,next)=>{if(!active)return;setSession(next);loadProfile(next).catch((e:Error)=>setError(e.message))});return()=>{active=false;l.subscription.unsubscribe()}},[loadProfile,supabase])
  const signOut=useCallback(async()=>{await supabase.auth.signOut();setProfile(null);setSession(null)},[supabase]);return{supabase,session,profile,loading,error,setError,signOut}
}

export function AuthScreen({role,supabase,error,onError}:{role:UgoRole;supabase:SupabaseClient;error:string;onError:(v:string)=>void}){
  const[mode,setMode]=useState<'login'|'register'|'recovery'>('login')
  const[name,setName]=useState('')
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[showPassword,setShowPassword]=useState(false)
  const[busy,setBusy]=useState(false)
  const[notice,setNotice]=useState('')
  const label=role==='client'?'Cliente':'Profesional'
  const appParam=role==='client'?'client':'provider'
  const authRedirectTo=`${window.location.origin}${window.location.pathname}?app=${appParam}`
  const title=mode==='login'?'Bienvenido a UGO':mode==='register'?'Creá tu cuenta':'Recuperá tu acceso'
  const description=mode==='recovery'
    ?'Ingresá tu email y te enviaremos un enlace seguro para crear una contraseña nueva.'
    :role==='client'
      ?'Pedí un servicio y seguí todo desde un solo lugar.'
      :'Recibí oportunidades y organizá tu trabajo con UGO.'
  const intro=role==='client'
    ?{eyebrow:'UGO CLIENTE',title:'Lo que necesitás, sin vueltas.',text:'Pedí un servicio, coordiná y seguí cada etapa desde el celular.',items:['Profesionales locales','Seguimiento del pedido','Actividad y pagos en un solo lugar']}
    :{eyebrow:'UGO PROFESIONAL',title:'Tu trabajo, mejor organizado.',text:'Conectate cuando quieras y gestioná oportunidades, agenda y ganancias.',items:['Vos elegís cuándo estar online','Pedidos y agenda claros','Actividad y ganancias ordenadas']}
  function changeMode(next:'login'|'register'|'recovery'){onError('');setNotice('');setPassword('');setShowPassword(false);setMode(next)}
  async function signInWithGoogle(){onError('');setNotice('');setBusy(true);try{window.localStorage.setItem(OAUTH_ROLE_KEY,role==='client'?'cliente':'proveedor');const{error:x}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectTo}});if(x)throw x}catch(x){window.localStorage.removeItem(OAUTH_ROLE_KEY);onError(x instanceof Error?x.message:'No se pudo iniciar sesión con Google.');setBusy(false)}}
  async function submit(e:FormEvent){e.preventDefault();onError('');setNotice('');setBusy(true);try{if(mode==='recovery'){const{error:x}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo});if(x)throw x;setNotice('Si existe una cuenta con este email, te enviamos un enlace para restablecer la contraseña.');return}if(mode==='login'){const{error:x}=await supabase.auth.signInWithPassword({email,password});if(x)throw x}else{if(!name.trim())throw new Error('Escribí tu nombre.');const{data,error:x}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectTo,data:{nombre:name.trim(),tipo:role==='client'?'cliente':'proveedor'}}});if(x)throw x;if(!data.session)setNotice('Cuenta creada. Revisá tu correo para confirmar el acceso.')}}catch(x){onError(x instanceof Error?x.message:'No se pudo completar el acceso.')}finally{setBusy(false)}}
  return <div className={`mvp-auth-page role-${role}`}>
    <button type="button" className="mvp-back" onClick={()=>go('home')} aria-label="Volver a UGO">← Volver</button>
    <div className="mvp-auth-shell">
      <section className="mvp-auth-intro" aria-label={intro.eyebrow}>
        <div className="mvp-auth-brand"><strong>UGO</strong><span>{label}</span></div>
        <div className="mvp-auth-intro-copy">
          <small>{intro.eyebrow}</small>
          <h2>{intro.title}</h2>
          <p>{intro.text}</p>
          <div className="mvp-auth-benefits">{intro.items.map(item=><span key={item}><i>✓</i>{item}</span>)}</div>
        </div>
        <button type="button" className="mvp-auth-role-switch" onClick={()=>go(role==='client'?'provider':'client')}>
          {role==='client'?'¿Trabajás con UGO? Abrir app Profesional →':'¿Necesitás un servicio? Abrir app Cliente →'}
        </button>
      </section>
      <section className="mvp-auth-card" aria-label={mode==='login'?'Iniciar sesión':mode==='register'?'Crear cuenta':'Recuperar contraseña'}>
        <header className="mvp-auth-card-head">
          <div className="mvp-mini-orb" aria-hidden="true"/>
          <div>
            <div className="mvp-kicker">UGO · {label.toUpperCase()}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        {mode!=='recovery'&&<div className="mvp-auth-tabs" role="tablist" aria-label="Acceso a UGO">
          <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>changeMode('login')}>Ingresar</button>
          <button type="button" role="tab" aria-selected={mode==='register'} className={mode==='register'?'active':''} onClick={()=>changeMode('register')}>Crear cuenta</button>
        </div>}
        {mode!=='recovery'&&<>
          <button type="button" className="mvp-google-button" onClick={signInWithGoogle} disabled={busy}><span className="mvp-google-mark">G</span><b>Continuar con Google</b></button>
          <div className="mvp-auth-divider"><span>o continuá con email</span></div>
        </>}
        <form onSubmit={submit}>
          {mode==='register'&&<label><span>Nombre</span><Input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Tu nombre" required/></label>}
          <label><span>Email</span><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="tu@email.com" required/></label>
          {mode!=='recovery'&&<label><span>Contraseña</span><div className="mvp-password-field"><Input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} placeholder="Mínimo 6 caracteres" required/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'}>{showPassword?'Ocultar':'Ver'}</button></div></label>}
          {mode==='login'&&<button type="button" className="mvp-auth-text-action" onClick={()=>changeMode('recovery')}>¿Olvidaste tu contraseña?</button>}
          {(error||notice)&&<div className={error?'mvp-form-error':'mvp-form-notice'} role={error?'alert':'status'} aria-live="polite">{error||notice}</div>}
          <Button className="mvp-primary" loading={busy}>{mode==='login'?'Ingresar a UGO':mode==='register'?'Crear cuenta':'Enviar enlace'}</Button>
          {mode==='recovery'&&<button type="button" className="mvp-auth-recovery-back" onClick={()=>changeMode('login')}>← Volver a ingresar</button>}
        </form>
        <p className="mvp-auth-footnote">{mode==='register'?'Al crear tu cuenta vas a poder completar tu perfil dentro de la app.':'Acceso seguro mediante UGO.'}</p>
      </section>
    </div>
  </div>
}

export function AppHeader({role,name,onLogout}:{role:string;name:string;onLogout:()=>void}){return <header className="mvp-header"><button className="mvp-brand" onClick={()=>go('home')}><span>U.G.O.</span><small>{role}</small></button><nav><button onClick={()=>go('client')}>Cliente</button><button onClick={()=>go('provider')}>Proveedor</button><button onClick={()=>go('admin')}>Control</button></nav><div className="mvp-user-chip"><span>{name.slice(0,1).toUpperCase()}</span>{name}<button onClick={onLogout}>Salir</button></div></header>}
export function StateTimeline({state}:{state:string}){const current=STATUS_ORDER.indexOf(state);return <div className="mvp-timeline">{STATUS_ORDER.map((item,index)=><div key={item} className={`mvp-step ${index<=current?'done':''} ${index===current?'current':''}`}><span>{index<current?'✓':index+1}</span><small>{STATUS_LABELS[item]}</small></div>)}</div>}
export function LoadingScreen({label='Conectando U.G.O.…'}:{label?:string}){return <div className="mvp-loading ugo-ds-loading" role="status" aria-live="polite"><div className="mvp-orb"><span/></div><p>{label}</p></div>}
export function HugoDock({role,service,availableOffers=0}:{role:UgoRole;service?:Service|null;availableOffers?:number}){const[open,setOpen]=useState(false);const text=useMemo(()=>{if(role==='client'){if(!service)return'Contame qué necesitás y preparo el pedido.';if(service.estado==='buscando')return'Estoy buscando profesionales disponibles.';if(service.estado==='ofrecido')return`Envié ${availableOffers||'las'} ofertas. Te aviso cuando acepten.`;if(service.estado==='asignado')return'Ya hay profesional y el pago quedó retenido.';if(service.estado==='en_camino')return'El profesional está en camino.';if(service.estado==='llegado')return'El profesional ya llegó. El trabajo todavía no comenzó.';if(service.estado==='en_progreso')return'El trabajo está en curso.';if(service.estado==='esperando_aprobacion')return'Revisá el trabajo. Al aprobarlo libero el pago.';if(service.estado==='disputado')return'El servicio está en disputa. UGO está revisando el caso y el flujo normal quedó detenido.';return'Servicio cerrado. Tu reseña actualiza el Karma.'}if(!service)return'Ponete disponible para recibir oportunidades.';if(service.estado==='asignado')return'Aceptaste la misión. Salí hacia el cliente.';if(service.estado==='en_camino')return'Confirmá llegada cuando estés en el lugar.';if(service.estado==='llegado')return'Ya estás en el lugar. Tomá evidencia inicial e iniciá el servicio.';if(service.estado==='en_progreso')return'Finalizá y pedí aprobación.';if(service.estado==='disputado')return'Este servicio está en disputa. No avances etapas hasta la resolución de UGO.';return'El pago sigue retenido hasta la aprobación.'},[availableOffers,role,service]);return <><button className="mvp-orb" onClick={()=>setOpen(v=>!v)} aria-label="Abrir Hugo"><span/></button>{open&&<aside className="mvp-hugo-panel"><div><div className="mvp-mini-orb"/><strong>Hugo</strong><button onClick={()=>setOpen(false)}>×</button></div><p>{text}</p><small>Contexto: {role} · {service?STATUS_LABELS[service.estado]:'sin servicio'}</small></aside>}</>}
