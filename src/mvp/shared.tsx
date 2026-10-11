import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { FormEvent, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { clearRoleSession, getRoleSupabase, signOutRole, type UgoRole } from '../lib/roleSupabase'
import { CLIENT_ACTIVE_SERVICE_STATES, MARKETPLACE_STATUS_LABELS, PROVIDER_ACTIVE_SERVICE_STATES, PROVIDER_LIFECYCLE_ORDER } from '../lib/marketplace/lifecycle'

export type Category = { id:string; slug:string; nombre:string; emoji:string }
export type UgoUser = { id:string; nombre:string; tipo:'cliente'|'proveedor'|'admin'|'superadmin'; activo:boolean; karma:number; servicios_completados:number }
export type ProviderProfile = { usuario_id:string; bio:string|null; tarifa_base:number; online:boolean; disponible:boolean; categoria_principal_id:string|null; estado_verificacion:string }
export type Service = { id:string; numero:number; cliente_id:string; proveedor_id:string|null; categoria_id:string; estado:string; descripcion:string; urgencia:boolean; direccion_cliente:string; zona:string|null; tarifa:number|null; created_at:string; updated_at:string; metadata?:Record<string,unknown>|null; categoria?:{id:string;nombre:string;emoji:string}|null; proveedor?:{id:string;nombre:string}|null }
export type Offer = { id:string; servicio_id:string; proveedor_id:string; estado:string; ranking:number|null; distancia_km:number|null; tarifa_ofrecida:number|null; expira_at:string|null; servicio?:Service|null }
export type Payment = { id:string; servicio_id:string; monto_bruto:number; comision_ugo:number; ganancia_proveedor:number; moneda:string; estado:string }
export type Notice = { type:'ok'|'error'|'info'; text:string } | null

export const ACTIVE_STATES=[...CLIENT_ACTIVE_SERVICE_STATES]
export const PROVIDER_ACTIVE_STATES=[...PROVIDER_ACTIVE_SERVICE_STATES]
export const STATUS_ORDER=[...PROVIDER_LIFECYCLE_ORDER]
export const STATUS_LABELS:Record<string,string>={...MARKETPLACE_STATUS_LABELS,pendiente:'Pendiente',autorizado:'Autorizado',retenido:'Retenido',liberado:'Liberado',reembolsado:'Reembolsado',fallido:'Fallido'}
export const money=(value:number|null|undefined,currency='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(Number(value||0))
export function timeAgo(value:string){const m=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/60000));if(m<1)return'ahora';if(m<60)return`hace ${m} min`;const h=Math.round(m/60);return h<24?`hace ${h} h`:`hace ${Math.round(h/24)} d`}
export function go(app:'client'|'provider'|'admin'|'home'){window.location.href=app==='home'?window.location.pathname:`${window.location.pathname}?app=${app}`}
const OAUTH_ROLE_KEY='ugo-oauth-intended-role'

const joinClasses=(...classes:Array<string|false|undefined>)=>classes.filter(Boolean).join(' ')

export function useRoleSession(role:UgoRole){
  const profileChannelInstance=useId().replace(/:/g,'')
  const supabase=useMemo(()=>getRoleSupabase(role),[role])
  const[session,setSession]=useState<Session|null>(null)
  const[profile,setProfile]=useState<UgoUser|null>(null)
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[profileChannelEpoch,setProfileChannelEpoch]=useState(0)

  const loadProfile=useCallback(async(next:Session|null)=>{if(!next){setProfile(null);return}let data:any=null,e:any;for(let attempt=0;attempt<4;attempt++){const query=supabase.from('usuarios').select('id,nombre,tipo,activo,karma,servicios_completados').eq('id',next.user.id).maybeSingle();const result=await query;data=result.data;e=result.error;if(!e)break;if(attempt===3)throw e}if(!data)throw new Error('No se encontró el perfil conectado a esta cuenta.');if(!data.activo){throw new Error('Esta cuenta está desactivada. Contactá a UGO si necesitás revisión.')}const expected=role==='client'?'cliente':'proveedor';if(data.tipo!==expected){window.localStorage.removeItem(OAUTH_ROLE_KEY);throw new Error(`Esta cuenta está registrada como ${data.tipo}. Abrí la aplicación correspondiente.`)}window.localStorage.removeItem(OAUTH_ROLE_KEY);setProfile(data as UgoUser)},[role,supabase])

  useEffect(()=>{let active=true;supabase.auth.getSession().then(async({data,error})=>{if(!active)return;if(error){setError(error.message);setLoading(false);return}if(!data.session){setSession(null);setProfile(null);setLoading(false);return}setSession(data.session);try{await loadProfile(data.session)}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la sesión.')}finally{if(active)setLoading(false)}}).catch(()=>{if(active){setError('No se pudo validar la sesión.');setLoading(false)}});const{data:l}=supabase.auth.onAuthStateChange((_event,next)=>{if(!active)return;if(next){setSession(next);void loadProfile(next).catch(()=>{})}else{setSession(null);setProfile(null)}});return()=>{active=false;l.subscription.unsubscribe()}},[loadProfile,supabase])

  const retryProfile=useCallback(async()=>{if(!session)return;setLoading(true);try{await loadProfile(session);setError('')}catch(e){setError(e instanceof Error?e.message:'No pudimos recuperar tu perfil.')}finally{setLoading(false)}},[loadProfile,session])

  const signOut=useCallback(async()=>{try{await signOutRole(role)}catch{}setProfile(null);setSession(null);clearRoleSession(role);window.localStorage.removeItem(OAUTH_ROLE_KEY)},[role])
  const clearAccess=useCallback(async()=>{try{await signOutRole(role)}catch{}finally{clearRoleSession(role);window.localStorage.removeItem(OAUTH_ROLE_KEY);setProfile(null);setSession(null);setError('')}},[role])

  return {supabase,session,profile,loading,error,setError,retryProfile,signOut,clearAccess}
}
