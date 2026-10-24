import{LanguageSelector}from'../i18n/LanguageSelector'
import{LocalizedText,useLocale}from'../i18n/locale'
/* eslint-disable react-refresh/only-export-components -- design system barrel: exporta primitivas, constantes y hooks junto a los componentes (patrón intencional UGO) */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { getRoleSupabase, getProviderAuthTrace, recordSessionDiagnostic, type UgoRole } from '../lib/roleSupabase'
import { CLIENT_ACTIVE_SERVICE_STATES, MARKETPLACE_STATUS_LABELS, PROVIDER_ACTIVE_SERVICE_STATES, PROVIDER_LIFECYCLE_ORDER } from '../lib/marketplace/lifecycle'

export type Category = { id:string; slug:string; nombre:string; emoji:string }
export type UgoUser = { id:string; nombre:string; tipo:'cliente'|'proveedor'|'admin'|'superadmin'; activo:boolean; karma:number; servicios_completados:number }
export type ProviderProfile = { usuario_id:string; bio:string|null; tarifa_base:number; online:boolean; disponible:boolean; categoria_principal_id:string|null; estado_verificacion:string }
export type Service = { id:string; numero:number; cliente_id:string; proveedor_id:string|null; categoria_id:string; estado:string; descripcion:string; urgencia:boolean; direccion_cliente:string|null; tarifa:number|null; comision_ugo:number|null; ganancia_proveedor:number|null; moneda:string; created_at:string; updated_at:string; categoria?:{nombre:string;emoji:string}|null; proveedor?:{nombre:string;karma:number}|null; cliente?:{nombre:string}|null }
export type Offer = { id:string; servicio_id:string; proveedor_id:string; estado:string; ranking:number|null; distancia_km:number|null; tarifa_ofrecida:number|null; expira_at:string|null; servicio?:Service|null }
export type Payment = { id:string; servicio_id:string; monto_bruto:number; comision_ugo:number; ganancia_proveedor:number; moneda:string; estado:string }
export type Notice = { type:'ok'|'error'|'info'; text:string } | null

export const ACTIVE_STATES=[...CLIENT_ACTIVE_SERVICE_STATES]
export const PROVIDER_ACTIVE_STATES=[...PROVIDER_ACTIVE_SERVICE_STATES]
export const STATUS_ORDER=[...PROVIDER_LIFECYCLE_ORDER]
export const STATUS_LABELS:Record<string,string>={...MARKETPLACE_STATUS_LABELS,pendiente:'Pendiente',autorizado:'Autorizado',retenido:'Retenido',liberado:'Liberado',reembolsado:'Reembolsado',fallido:'Fallido'}
export const money=(value:number|null|undefined,currency='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(Number(value||0))
export function timeAgo(value:string){const m=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/60000));if(m<1)return'ahora';if(m<60)return`hace ${m} min`;const h=Math.round(m/60);return h<24?`hace ${h} h`:new Date(value).toLocaleDateString('es-AR')}
export function go(app:'client'|'provider'|'admin'|'home'){window.location.href=app==='home'?window.location.pathname:`${window.location.pathname}?app=${app}`}
const OAUTH_ROLE_KEY='ugo-oauth-intended-role'
function sharedSignInError(error:unknown,t:(key:string)=>string){
 const value=error as {code?:unknown;message?:unknown}|null
 const code=typeof value?.code==='string'?value.code:''
 const message=typeof value?.message==='string'?value.message:''
 return code==='invalid_credentials'||code==='invalid_grant'||/invalid login credentials/i.test(message)
  ?t('sharedUi.invalidCredentials')
  :t('sharedUi.retryAccess')
}

/** Shared UGO Design System primitives. Keep screen composition in feature modules. */
const joinClasses=(...classes:Array<string|false|undefined>)=>classes.filter(Boolean).join(' ')
export type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'success'|'danger';loading?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(function Button({variant='primary',loading=false,disabled,children,className,...props},ref){const{t}=useLocale();return <button ref={ref} className={joinClasses('ugo-ds-button',variant,className)} disabled={disabled||loading} aria-busy={loading||undefined} {...props}>{loading?t('sharedUi.processing'):children}</button>})
export type IconButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{label:string}
export const IconButton=React.forwardRef<HTMLButtonElement,IconButtonProps>(function IconButton({label,children,className,...props},ref){return <button ref={ref} type="button" className={joinClasses('ugo-ds-icon-button',className)} aria-label={label} {...props}>{children}</button>})
export const Input=React.forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input({className,...props},ref){return <input ref={ref} className={joinClasses('ugo-ds-field',className)} {...props}/>} )
export type SearchProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'> & {onClear?:()=>void; searchLabel?:string}
export const Search=React.forwardRef<HTMLInputElement,SearchProps>(function Search({onClear,searchLabel,value,defaultValue,className,...props},ref){const{t}=useLocale();const hasValue=String(value??defaultValue??'').length>0;return <div className={joinClasses('ugo-ds-search',className)} role="search"><span aria-hidden="true">⌕</span><input ref={ref} type="search" aria-label={searchLabel||t('sharedUi.search')} value={value} defaultValue={defaultValue} {...props}/>{hasValue&&onClear?<IconButton label={t('sharedUi.clearSearch')} onClick={onClear}>×</IconButton>:null}</div>})
export const Card=React.forwardRef<HTMLDivElement,HTMLAttributes<HTMLDivElement>>(function Card({className,...props},ref){return <div ref={ref} className={joinClasses('ugo-ds-card',className)} {...props}/>})
export type BadgeProps=HTMLAttributes<HTMLSpanElement>&{variant?:'success'|'warning'|'error'}
export function Badge({variant='success',className,...props}:BadgeProps){return <span className={joinClasses('ugo-ds-badge',variant&&`ugo-ds-status ${variant}`,className)} {...props}/>}
export type AvatarProps=HTMLAttributes<HTMLDivElement>&{name?:string;src?:string;alt?:string}
export function Avatar({name='',src,alt=name,className,...props}:AvatarProps){const initials=name.trim().split(/\s+/).map(part=>part[0]).filter(Boolean).slice(0,2).join('').toUpperCase();return <div className={joinClasses('ugo-ds-avatar',className)} role={src?'img':undefined} aria-label={src?alt:undefined} {...props}>{src?<img src={src} alt={alt}/>:initials||'UG'}</div>}
export type TopBarProps=HTMLAttributes<HTMLElement>&{title?:string;leading?:React.ReactNode;actions?:React.ReactNode}
export function TopBar({title,leading,actions,children,className,...props}:TopBarProps){return <header className={joinClasses('ugo-ds-topbar',className)} {...props}>{leading}<div className="ugo-ds-topbar-title">{title}</div>{children}<div className="ugo-ds-topbar-actions">{actions}</div></header>}
export type BottomNavigationItem={id:string;label:string;icon?:React.ReactNode}
export function BottomNavigation({items,active,onChange,className}:{items:BottomNavigationItem[];active?:string;onChange?:(id:string)=>void;className?:string}){const{t}=useLocale();return <nav className={joinClasses('ugo-ds-bottom-nav',className)} aria-label={t('sharedUi.navigation')}>{items.map(item=><button key={item.id} type="button" className={item.id===active?'active':undefined} aria-current={item.id===active?'page':undefined} onClick={()=>onChange?.(item.id)}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>}
export function BottomSheet({open,title,onClose,children,className}:{open:boolean;title?:string;onClose:()=>void;children:React.ReactNode;className?:string}){const{t}=useLocale();if(!open)return null;return <div className="ugo-ds-sheet-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className={joinClasses('ugo-ds-bottom-sheet','ugo-ds-sheet',className)} role="dialog" aria-modal="true" aria-label={title||t('sharedUi.panel')} onMouseDown={event=>event.stopPropagation()}><div className="ugo-ds-sheet-handle" aria-hidden="true"/>{title&&<div className="ugo-ds-sheet-header"><h2>{title}</h2><IconButton label={t('sharedUi.closePanel')} onClick={onClose}>×</IconButton></div>}{children}</section></div>}
export function Drawer({open,title,side='left',onClose,children,className}:{open:boolean;title?:string;side?:'left'|'right';onClose:()=>void;children:React.ReactNode;className?:string}){const{t}=useLocale();if(!open)return null;return <div className="ugo-ds-drawer-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className={joinClasses('ugo-ds-drawer',`side-${side}`,className)} role="dialog" aria-modal="true" aria-label={title||t('sharedUi.menu')} onMouseDown={event=>event.stopPropagation()}>{title&&<div className="ugo-ds-drawer-header"><h2>{title}</h2><IconButton label={t('sharedUi.closeMenu')} onClick={onClose}>×</IconButton></div>}{children}</aside></div>}
export function Modal({open,title,onClose,children,className}:{open:boolean;title:string;onClose:()=>void;children:React.ReactNode;className?:string}){const{t}=useLocale();if(!open)return null;return <div className="ugo-ds-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className={joinClasses('ugo-ds-modal',className)} role="dialog" aria-modal="true" aria-labelledby="ugo-ds-modal-title" onMouseDown={event=>event.stopPropagation()}><div className="ugo-ds-modal-header"><h2 id="ugo-ds-modal-title">{title}</h2><IconButton label={t('sharedUi.closeWindow')} onClick={onClose}>×</IconButton></div>{children}</section></div>}
export type FloatingActionButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{label:string}
export const FloatingActionButton=React.forwardRef<HTMLButtonElement,FloatingActionButtonProps>(function FloatingActionButton({label,children,...props},ref){return <button ref={ref} type="button" className="ugo-ds-fab" aria-label={label} {...props}>{children}</button>})
export type GlobalStateProps={title?:string;description?:string;actionLabel?:string;onAction?:()=>void;className?:string}
function GlobalState({kind,title,description,actionLabel,onAction,className}:GlobalStateProps&{kind:'empty'|'error'|'retry'|'success';}){return <section className={joinClasses('ugo-ds-state',`ugo-ds-state-${kind}`,className)} role={kind==='error'?'alert':'status'}><span className="ugo-ds-state-icon" aria-hidden="true">{kind==='error'?'!':kind==='success'?'✓':kind==='retry'?'↻':'○'}</span>{title&&<h2>{title}</h2>}{description&&<p>{description}</p>}{actionLabel&&onAction&&<Button variant={kind==='error'?'danger':'primary'} onClick={onAction}>{actionLabel}</Button>}</section>}
export function EmptyState(props:GlobalStateProps){const{t}=useLocale();return <GlobalState kind="empty" title={props.title||t('sharedUi.emptyTitle')} description={props.description||t('sharedUi.emptyDescription')} {...props}/>}
export function ErrorState(props:GlobalStateProps){const{t}=useLocale();return <GlobalState kind="error" title={props.title||t('sharedUi.loadError')} description={props.description||t('sharedUi.loadRetry')} actionLabel={props.actionLabel||t('sharedUi.retry')} {...props}/>}
export function RetryState(props:GlobalStateProps){const{t}=useLocale();return <GlobalState kind="retry" title={props.title||t('sharedUi.tryAgain')} description={props.description} actionLabel={props.actionLabel||t('sharedUi.retry')} {...props}/>}
export function SuccessState(props:GlobalStateProps){const{t}=useLocale();return <GlobalState kind="success" title={props.title||t('sharedUi.ready')} description={props.description} {...props}/>}
export function OfflineState({onAction,className}:{onAction?:()=>void;className?:string}){const{t}=useLocale();return <div className={joinClasses('ugo-ds-offline',className)} role="status"><span aria-hidden="true">⌁</span><span>{t('sharedUi.offline')}</span>{onAction&&<button type="button" onClick={onAction}><LocalizedText id="screen.demand.18"/></button>}</div>}

const AUTH_PROFILE_RETRY_DELAYS=[0,350,900,1800] as const
function transientProfileError(value:unknown){
  const text=value instanceof Error?value.message:String((value as any)?.message||value||'')
  return /timeout|timed out|statement timeout|57014|fetch|network|abort|connection|temporar|pgrst/i.test(text)
}
async function wait(ms:number){if(ms>0)await new Promise(resolve=>window.setTimeout(resolve,ms))}
async function withProfileTimeout<T>(operation:PromiseLike<T>&{abortSignal?:(signal:AbortSignal)=>PromiseLike<T>},ms=4500){
  // A Promise.race alone leaves the PostgREST request running after timeout.
  // Abort the actual fetch so repeated recovery attempts cannot pile up.
  const controller=new AbortController()
  const request=typeof operation.abortSignal==='function'?operation.abortSignal(controller.signal):operation
  let timer:ReturnType<typeof setTimeout>|undefined
  try{
    return await Promise.race([Promise.resolve(request),new Promise<T>((_,reject)=>{
      timer=window.setTimeout(()=>{reject(new Error('PROFILE_QUERY_TIMEOUT'));controller.abort()},ms)
    })])
  }finally{if(timer!==undefined)window.clearTimeout(timer)}
}

export function useRoleSession(role:UgoRole){
  const profileChannelInstance=useId().replace(/:/g,'')
  const profileGeneration=useRef(0)
  const realtimeProfileRefreshAt=useRef(0)
  const[sessionChecked,setSessionChecked]=useState(false),[sessionEpoch,setSessionEpoch]=useState(0)
  const supabase=useMemo(()=>getRoleSupabase(role),[role]);const[session,setSession]=useState<Session|null>(null);const[profile,setProfile]=useState<UgoUser|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[profileChannelEpoch,setProfileChannelEpoch]=useState(0)
  const loadProfile=useCallback(async(next:Session|null)=>{if(!next){setProfile(null);return}const generation=profileGeneration.current;let data:any=null,e:any;for(let attempt=0;attempt<AUTH_PROFILE_RETRY_DELAYS.length;attempt++){await wait(AUTH_PROFILE_RETRY_DELAYS[attempt]);if(generation!==profileGeneration.current)return;const query=supabase.from('usuarios').select('id,nombre,tipo,activo,karma,servicios_completados').eq('id',next.user.id).maybeSingle();try{const result=await withProfileTimeout(query,4500);data=result.data;e=result.error}catch(queryError){e=queryError}if(!e)break;if(!transientProfileError(e)||attempt===AUTH_PROFILE_RETRY_DELAYS.length-1)throw e}if(generation!==profileGeneration.current)return;if(!data)throw new Error('No se encontró el perfil conectado a esta cuenta.');if(!data.activo){setProfile(null);throw new Error('Esta cuenta está desactivada. Contactá a UGO si necesitás revisión.')}const expected=role==='client'?'cliente':'proveedor';const pendingRole=window.localStorage.getItem(OAUTH_ROLE_KEY);const isFreshOAuthUser=Date.now()-new Date(next.user.created_at).getTime()<120000;if(role==='provider'&&data.tipo==='cliente'&&pendingRole==='proveedor'&&isFreshOAuthUser){const{error:updateError}=await supabase.from('usuarios').update({tipo:'proveedor'}).eq('id',next.user.id);if(updateError)throw updateError;const{error:providerError}=await supabase.from('perfiles_proveedor').upsert({usuario_id:next.user.id},{onConflict:'usuario_id'});if(providerError)throw providerError;const refreshed=await supabase.from('usuarios').select('id,nombre,tipo,activo,karma,servicios_completados').eq('id',next.user.id).single();if(refreshed.error)throw refreshed.error;data=refreshed.data}if(data.tipo!==expected){setProfile(null);window.localStorage.removeItem(OAUTH_ROLE_KEY);throw new Error(`Esta cuenta está registrada como ${data.tipo}. Abrí la aplicación correspondiente.`)}window.localStorage.removeItem(OAUTH_ROLE_KEY);if(generation===profileGeneration.current)setProfile(data as UgoUser)},[role,supabase])
  useEffect(()=>{
    let active=true;let authEventVersion=0
    const diagnostic=(reason:Parameters<typeof recordSessionDiagnostic>[2])=>recordSessionDiagnostic(role,'auth',reason)
    const unavailable=()=>{if(!active)return;diagnostic('session_check_failed');setError('No pudimos comprobar tu sesión por un problema de conexión. Reintentá sin borrar tus credenciales.');setLoading(false)}
    const failSafe=window.setTimeout(()=>{if(!active)return;setError(current=>current||'UGO está tardando en cargar tu perfil. Reintentá para comprobar tu sesión.');setLoading(false)},15000)
    supabase.auth.getSession().then(async({data,error:sessionError})=>{
      if(!active||authEventVersion>0)return
      if(sessionError){unavailable();return}
      profileGeneration.current++
      setSession(data.session);setSessionChecked(true)
      diagnostic(data.session?'session_restored':'login_no_session')
      if(data.session){const url=new URL(window.location.href);if(url.searchParams.has('code')){url.searchParams.delete('code');url.searchParams.delete('error');url.searchParams.delete('error_code');url.searchParams.delete('error_description');window.history.replaceState({},'',url.toString())}}
      const version=authEventVersion
      try{await loadProfile(data.session);if(active&&version===authEventVersion)setError('')}
      catch(e){if(active&&version===authEventVersion){diagnostic('profile_failed');setError(transientProfileError(e)?'UGO está recuperando la conexión con tu perfil. Tu sesión sigue activa; reintentá en unos segundos.':e instanceof Error?e.message:'No se pudo cargar el perfil.');if(!transientProfileError(e))setProfile(null)}}
      finally{window.clearTimeout(failSafe);if(active)setLoading(false)}
    }).catch(unavailable)
    const{data:l}=supabase.auth.onAuthStateChange((event,next)=>{
      if(!active)return
      // INITIAL_SESSION can be null when SDK recovery failed. The separate
      // error-aware getSession result must decide whether to display login.
      if(event==='INITIAL_SESSION'&&!next)return
      authEventVersion++
      const version=authEventVersion
      recordSessionDiagnostic(role,'auth',event==='TOKEN_REFRESHED'?'token_refreshed':event==='SIGNED_OUT'?'signed_out_received':'auth_event',event)
      if(event==='SIGNED_OUT'){
        // Confirm outside the auth callback; never apply an obsolete snapshot.
        profileGeneration.current++
        window.setTimeout(()=>{
          if(!active||version!==authEventVersion)return
          void supabase.auth.getSession().then(({data,error:sessionError})=>{
            if(!active||version!==authEventVersion)return
            if(sessionError){unavailable();return}
            if(data.session){
              // A transient SIGNED_OUT during token recovery must restore the
              // profile too; otherwise the Provider can remain on recovery UI.
              setSession(data.session);setSessionChecked(true)
              void loadProfile(data.session).then(()=>{if(active&&version===authEventVersion)setError('')})
                .catch((e:Error)=>{if(active&&version===authEventVersion)setError(e.message)})
                .finally(()=>{if(active&&version===authEventVersion){window.clearTimeout(failSafe);setLoading(false)}})
              return
            }
            // An SDK SIGNED_OUT event followed by one empty getSession can be
            // transient during token/storage recovery. Keep the current provider
            // screen until a second check confirms absence of a session.
            window.setTimeout(()=>{
              if(!active||version!==authEventVersion)return
              void supabase.auth.getSession().then(({data:confirmed,error:confirmError})=>{
                if(!active||version!==authEventVersion)return
                if(confirmError){unavailable();return}
                if(confirmed.session){
                  setSession(confirmed.session);setSessionChecked(true)
                  void loadProfile(confirmed.session).then(()=>{if(active&&version===authEventVersion)setError('')})
                    .catch((e:Error)=>{if(active&&version===authEventVersion)setError(e.message)})
                    .finally(()=>{if(active&&version===authEventVersion){window.clearTimeout(failSafe);setLoading(false)}})
                  return
                }
                profileGeneration.current++
                setSession(null);setProfile(null);setSessionChecked(true);setError('')
                diagnostic('login_confirmed_signed_out')
                window.clearTimeout(failSafe);setLoading(false)
              }).catch(unavailable)
            },1200)
          }).catch(unavailable)
        },0)
        return
      }
      if(next){setSession(next);setSessionChecked(true);setProfile(current=>current?.id===next.user.id?current:null)}
      if(event==='TOKEN_REFRESHED')return
      if(!next)return
      const generation=++profileGeneration.current
      window.setTimeout(()=>{
        if(!active||generation!==profileGeneration.current)return
        void loadProfile(next).then(()=>{if(active&&generation===profileGeneration.current)setError('')})
          .catch((e:Error)=>{if(active&&generation===profileGeneration.current){diagnostic('profile_failed');setError(transientProfileError(e)?'UGO está recuperando la conexión con tu perfil. Tu sesión sigue activa; reintentá en unos segundos.':e.message)}})
          .finally(()=>{if(active){window.clearTimeout(failSafe);setLoading(false)}})
      },0)
    })
    // Going online must not remount the auth bootstrap or temporarily replace a valid
    // provider session with a guest state. Realtime reconnection is handled below;
    // failed session checks can still be retried explicitly by the user.
    return()=>{active=false;profileGeneration.current++;window.clearTimeout(failSafe);l.subscription.unsubscribe()}
  },[loadProfile,role,sessionEpoch,supabase])
  const profileSessionRef=useRef(session)
  profileSessionRef.current=session
  const profileUserId=session?.user.id
  useEffect(()=>{
    const userId=profileUserId
    if(!userId)return
    let alive=true,reconnectTimer:number|undefined
    const refresh=()=>{const current=profileSessionRef.current;if(alive&&current?.user.id===userId)void loadProfile(current).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No pudimos actualizar tu perfil.')})}
    const refreshRealtime=()=>{
      // SUBSCRIBED can flap during a database outage; one read per 30 seconds
      // is sufficient to reconcile profile changes after reconnect.
      const now=Date.now()
      if(now-realtimeProfileRefreshAt.current<30_000)return
      realtimeProfileRefreshAt.current=now
      refresh()
    }
    const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setProfileChannelEpoch(value=>value+1)},1200)}
    const onOnline=()=>{refresh();reconnect()}
    const onVisibility=()=>{if(document.visibilityState==='visible')refresh()}
    window.addEventListener('online',onOnline)
    document.addEventListener('visibilitychange',onVisibility)
    const channelName=`ugo-profile-${role}-${userId}-${profileChannelInstance}-${profileChannelEpoch}`
    const channel=supabase.channel(channelName)
    channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'usuarios',filter:`id=eq.${userId}`},refresh)
    channel.subscribe(status=>{if(status==='SUBSCRIBED')refreshRealtime();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')reconnect()})
    return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(channel)}
  },[loadProfile,profileChannelEpoch,profileChannelInstance,role,profileUserId,supabase])
  const retrySession=useCallback(()=>{setLoading(true);setSessionEpoch(value=>value+1)},[]);const retryProfile=useCallback(async()=>{if(!session)return;setLoading(true);try{await loadProfile(session);setError('')}catch(e){setError(e instanceof Error?e.message:'No pudimos recuperar tu perfil.')}finally{setLoading(false)}},[loadProfile,session]);const signOut=useCallback(async()=>{const{error:signOutError}=await supabase.auth.signOut({scope:'local'});if(signOutError)throw signOutError;profileGeneration.current++;recordSessionDiagnostic(role,'auth','explicit_sign_out');setSessionChecked(true);setProfile(null);setSession(null)},[role,supabase]);const clearAccess=useCallback(async()=>{try{await supabase.auth.signOut({scope:'local'})}finally{window.localStorage.removeItem(OAUTH_ROLE_KEY);setProfile(null);setSession(null);setError('')}},[supabase]);return{supabase,session,sessionChecked,profile,loading,error,setError,retrySession,retryProfile,signOut,clearAccess}
}

export function AuthScreen({role,supabase,error,onError,onResetAccess}:{role:UgoRole;supabase:SupabaseClient;error:string;onError:(v:string)=>void;onResetAccess?:()=>Promise<void>}){
  const{t}=useLocale()
  const[mode,setMode]=useState<'login'|'register'|'recovery'>('login')
  const[name,setName]=useState('')
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[showPassword,setShowPassword]=useState(false)
  const[busy,setBusy]=useState(false)
  const[notice,setNotice]=useState('')
  const label=t(role==='client'?'sharedUi.client':'sharedUi.professional')
  const appParam=role==='client'?'client':'provider'
  const authRedirectTo=`${window.location.origin}${window.location.pathname}?app=${appParam}`
  const title=mode==='login'?t('sharedUi.welcome'):mode==='register'?t('sharedUi.createAccount'):t('sharedUi.recoverAccess')
  const description=mode==='recovery'
    ?t('sharedUi.recoveryDescription')
    :role==='client'
      ?t('sharedUi.clientIntro')
      :t('sharedUi.providerIntro')
  const intro=role==='client'
    ?{eyebrow:t('sharedUi.clientEyebrow'),title:t('sharedUi.clientHeadline'),text:t('sharedUi.clientText'),items:[t('sharedUi.clientLocalPros'),t('sharedUi.clientTracking'),t('sharedUi.clientActivity')]}
    :{eyebrow:t('sharedUi.providerEyebrow'),title:t('sharedUi.providerHeadline'),text:t('sharedUi.providerText'),items:[t('sharedUi.providerFlexible'),t('sharedUi.providerAgenda'),t('sharedUi.providerIncome')]}
  function changeMode(next:'login'|'register'|'recovery'){onError('');setNotice('');setPassword('');setShowPassword(false);setMode(next)}
  async function signInWithGoogle(){onError('');setNotice('');setBusy(true);try{window.localStorage.setItem(OAUTH_ROLE_KEY,role==='client'?'cliente':'proveedor');const{error:x}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectTo}});if(x)throw x}catch{window.localStorage.removeItem(OAUTH_ROLE_KEY);onError(t('sharedUi.retryAccess'));setBusy(false)}}
  async function submit(e:FormEvent){e.preventDefault();onError('');setNotice('');setBusy(true);try{if(mode==='recovery'){const{error:x}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo});if(x)throw x;setNotice(t('sharedUi.recoverySent'));return}if(mode==='login'){const{error:x}=await supabase.auth.signInWithPassword({email,password});if(x)throw x}else{if(!name.trim())throw new Error(t('sharedUi.nameRequired'));const{data,error:x}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectTo,data:{nombre:name.trim(),tipo:role==='client'?'cliente':'proveedor'}}});if(x)throw x;if(!data.session)setNotice(t('sharedUi.accountCreated'))}}catch(error){onError(mode==='login'?sharedSignInError(error,t):t('sharedUi.retryAccess'))}finally{setBusy(false)}}
  return <div className={`mvp-auth-page role-${role}`}>
    <button type="button" className="mvp-back" onClick={()=>go('home')} aria-label={t('sharedUi.return')}><LocalizedText id="screen.need.8"/></button>
    <div className="mvp-auth-shell">
      <section className="mvp-auth-intro" aria-label={intro.eyebrow}>
        <div className="mvp-auth-brand"><strong><LocalizedText id="ugoWebRemaining.brand"/></strong><span>{label}</span></div>
        <div className="mvp-auth-intro-copy">
          <small>{intro.eyebrow}</small>
          <h2>{intro.title}</h2>
          <p>{intro.text}</p>
          <div className="mvp-auth-benefits">{intro.items.map(item=><span key={item}><i>✓</i>{item}</span>)}</div>
        </div>
        <button type="button" className="mvp-auth-role-switch" onClick={()=>go(role==='client'?'provider':'client')}>
          {t(role==='client'?'sharedUi.clientSwitch':'sharedUi.providerSwitch')}
        </button>
      </section>
      <section className="mvp-auth-card" aria-label={title}>
        <header className="mvp-auth-card-head">
          <div className="mvp-mini-orb" aria-hidden="true"/>
          <div>
            <div className="mvp-kicker">UGO · {label.toUpperCase()}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        {mode!=='recovery'&&<div className="mvp-auth-tabs" role="tablist" aria-label={t('sharedUi.access')}>
          <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>changeMode('login')}><LocalizedText id="adminSurface.enter"/></button>
          <button type="button" role="tab" aria-selected={mode==='register'} className={mode==='register'?'active':''} onClick={()=>changeMode('register')}><LocalizedText id="screen.admin_users.5"/></button>
        </div>}
        {mode!=='recovery'&&<>
          <button type="button" className="mvp-google-button" onClick={signInWithGoogle} disabled={busy}><span className="mvp-google-mark">G</span><b>{t('sharedUi.google')}</b></button>
          <div className="mvp-auth-divider"><span>{t('sharedUi.orEmail')}</span></div>
        </>}
        <LanguageSelector/><form data-testid="auth-form" onSubmit={submit}>
          {mode==='register'&&<label><span><LocalizedText id="screen.admin_users.11"/></span><Input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder={t('sharedUi.name')} required/></label>}
          <label><span><LocalizedText id="screen.admin_users.13"/></span><Input data-testid="auth-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder={t('sharedUi.emailExample')} required/></label>
          {mode!=='recovery'&&<label><span>{t('sharedUi.password')}</span><div className="mvp-password-field"><Input data-testid="auth-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} placeholder={t('sharedUi.passwordMinimum')} required/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={t(showPassword?'sharedUi.hidePassword':'sharedUi.showPassword')}>{showPassword?t('sharedUi.hidePassword'):t('sharedUi.showPassword')}</button></div></label>}
          {mode==='login'&&<button type="button" className="mvp-auth-text-action" onClick={()=>changeMode('recovery')}>{t('sharedUi.forgotPassword')}</button>}
          {(error||notice)&&<div className={error?'mvp-form-error':'mvp-form-notice'} role={error?'alert':'status'} aria-live="polite">{error?`${error} ${t('sharedUi.errorTryAgain')}`:notice}</div>}{error&&onResetAccess&&<button type="button" className="mvp-auth-text-action" onClick={()=>void onResetAccess()}>{t('sharedUi.sessionRetry')}</button>}
          <Button className="mvp-primary" loading={busy}>{mode==='login'?t('sharedUi.signIn'):mode==='register'?t('sharedUi.createAccount'):t('sharedUi.sendLink')}</Button>
          {mode==='recovery'&&<button type="button" className="mvp-auth-recovery-back" onClick={()=>changeMode('login')}>{t('sharedUi.backToSignIn')}</button>}
        </form>
        {role==='provider'&&<button type="button" className="mvp-auth-text-action" onClick={()=>{const data=getProviderAuthTrace();void navigator.clipboard?.writeText(data).then(()=>setNotice('Diagnóstico técnico copiado. No contiene contraseñas ni tokens.')).catch(()=>setNotice(data))}}>{t('sharedUi.copySessionDiagnostic')}</button>}
        <p className="mvp-auth-footnote">{mode==='register'?t('sharedUi.finishProfile'):t('sharedUi.accessSecure')}</p>
      </section>
    </div>
  </div>
}

export function AppHeader({role,name,onLogout}:{role:string;name:string;onLogout:()=>void}){const{t}=useLocale();return <header className="mvp-header"><button className="mvp-brand" onClick={()=>go('home')}><span>U.G.O.</span><small>{role}</small></button><nav><button onClick={()=>go('client')}><LocalizedText id="screen.admin_users.15"/></button><button onClick={()=>go('provider')}><LocalizedText id="screen.admin_services.20"/></button><button onClick={()=>go('admin')}>{t('mvp.control')}</button></nav><div className="mvp-user-chip"><span>{name.slice(0,1).toUpperCase()}</span>{name}<button onClick={onLogout}><LocalizedText id="providerOnboarding.exit"/></button></div></header>}
export function StateTimeline({state}:{state:string}){const current=(STATUS_ORDER as readonly string[]).indexOf(state);return <div className="mvp-timeline">{STATUS_ORDER.map((item,index)=><div key={item} className={`mvp-step ${index<=current?'done':''} ${index===current?'current':''}`}><span>{index<current?'✓':index+1}</span><small>{STATUS_LABELS[item]}</small></div>)}</div>}
export function LoadingScreen({label='Abriendo UGO…'}:{label?:string}){return <main className="mvp-loading ugo-ds-loading ugo-app-splash" role="status" aria-live="polite" aria-label={label}><div className="ugo-splash-glow" aria-hidden="true"/><section className="ugo-splash-content"><div className="ugo-splash-logo" aria-hidden="true">UG<span>O</span></div><div className="ugo-splash-mark" aria-hidden="true"><i/><i/><i/></div><p>{label}</p><div className="ugo-splash-progress" aria-hidden="true"><span/></div><small><LocalizedText id="landing.tagline"/></small></section></main>}
export function HugoDock({role,service,availableOffers=0}:{role:UgoRole;service?:Service|null;availableOffers?:number}){const{t}=useLocale();const[open,setOpen]=useState(false);const state=service?.estado||'';const text=useMemo(()=>{if(role==='client'){if(!service)return t('mvp.client.idle');if(state==='buscando')return t('mvp.client.searching');if(state==='ofrecido')return t('mvp.client.offers',{count:availableOffers});if(state==='asignado')return t('mvp.client.assigned');if(state==='en_camino')return t('mvp.client.enRoute');if(state==='llegado')return t('mvp.client.arrived');if(state==='en_progreso')return t('mvp.client.working');if(state==='esperando_aprobacion')return t('mvp.client.approval');if(state==='disputado')return t('mvp.client.dispute');return t('mvp.client.closed')}if(!service)return t('mvp.provider.idle');if(state==='asignado')return t('mvp.provider.assigned');if(state==='en_camino')return t('mvp.provider.enRoute');if(state==='llegado')return t('mvp.provider.arrived');if(state==='en_progreso')return t('mvp.provider.working');if(state==='disputado')return t('mvp.provider.dispute');return t('mvp.provider.paymentHeld')},[availableOffers,role,service,state,t]);const roleLabel=role==='client'?t('mvp.role.client'):t('mvp.role.provider');const status=state?t('mvp.status.'+state):t('mvp.status.cerrado');return <><button className="mvp-orb" onClick={()=>setOpen(v=>!v)} aria-label={t('mvp.openHugo')}><span/></button>{open&&<aside className="mvp-hugo-panel"><div><div className="mvp-mini-orb"/><strong>{t('mvp.hugo')}</strong><button onClick={()=>setOpen(false)}>×</button></div><p>{text}</p><small>{t('mvp.context')} {roleLabel} · {service?status:t('mvp.status.cerrado')}</small></aside>}</>}
