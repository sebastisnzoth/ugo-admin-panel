import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'

export type UgoLocale='pt-BR'|'es'|'en'
type LocaleContextValue={locale:UgoLocale;setLocale:(locale:UgoLocale)=>void;t:(key:string)=>string}
const STORAGE_KEY='ugo.locale'
const SUPPORTED:UgoLocale[]=['pt-BR','es','en']
const messages:Record<UgoLocale,Record<string,string>>={
 'pt-BR':{'language.label':'Idioma','language.portuguese':'Português (Brasil)','language.spanish':'Espanhol','language.english':'Inglês','language.saved':'Idioma atualizado.','language.saveError':'Idioma salvo neste dispositivo; não foi possível sincronizar com a conta.','language.loading':'Carregando idioma…'},
 es:{'language.label':'Idioma','language.portuguese':'Portugués (Brasil)','language.spanish':'Español','language.english':'Inglés','language.saved':'Idioma actualizado.','language.saveError':'Idioma guardado en este dispositivo; no se pudo sincronizar con la cuenta.','language.loading':'Cargando idioma…'},
 en:{'language.label':'Language','language.portuguese':'Portuguese (Brazil)','language.spanish':'Spanish','language.english':'English','language.saved':'Language updated.','language.saveError':'Language saved on this device; account sync failed.','language.loading':'Loading language…'}
}
const LocaleContext=createContext<LocaleContextValue|null>(null)
function isLocale(value:unknown):value is UgoLocale{return typeof value==='string'&&SUPPORTED.includes(value as UgoLocale)}
function roleFromLocation():UgoRole|'admin'|null{
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client'||app==='client-web'||app==='stitch-client')return'client'
 if(app==='provider'||app==='provider-web'||app==='recruit')return'provider'
 if(app==='admin')return'admin'
 return null
}
function authClient(){const role=roleFromLocation();return role==='client'||role==='provider'?getRoleSupabase(role):role==='admin'?adminSupabase:null}
function initialLocale():UgoLocale{try{const stored=window.localStorage.getItem(STORAGE_KEY);if(isLocale(stored))return stored}catch{}return'pt-BR'}

export function LocaleProvider({children}:{children:React.ReactNode}){
 const[locale,setLocaleState]=useState<UgoLocale>(initialLocale)
 useEffect(()=>{
  const client=authClient()
  if(!client)return
  let alive=true
  const applySessionLocale=async()=>{
   const{data,error}=await client.auth.getSession()
   if(!alive||error||!data.session)return
   const saved=data.session.user.user_metadata?.preferred_language
   if(isLocale(saved)){setLocaleState(saved);try{window.localStorage.setItem(STORAGE_KEY,saved)}catch{}}
   else{const current=initialLocale();void client.auth.updateUser({data:{preferred_language:current}})}
  }
  void applySessionLocale()
  const{data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(!alive||!session||!['SIGNED_IN','USER_UPDATED','TOKEN_REFRESHED'].includes(event))return
   const saved=session.user.user_metadata?.preferred_language
   if(isLocale(saved)){setLocaleState(saved);try{window.localStorage.setItem(STORAGE_KEY,saved)}catch{}}
  })
  return()=>{alive=false;subscription.unsubscribe()}
 },[])
 const setLocale=useCallback((next:UgoLocale)=>{
  if(!isLocale(next))return
  setLocaleState(next)
  try{window.localStorage.setItem(STORAGE_KEY,next)}catch{}
  const client=authClient()
  if(!client)return
  const warnLocal=()=>console.warn('[UGO i18n] Preference remains local; account sync failed.')
  void (async()=>{
   try{
    const{data,error:sessionError}=await client.auth.getSession()
    if(sessionError||!data.session)return
    const{error:updateError}=await client.auth.updateUser({data:{preferred_language:next}})
    if(updateError)warnLocal()
   }catch{
    warnLocal()
   }
  })()
 },[])
 const value=useMemo<LocaleContextValue>(()=>({locale,setLocale,t:(key)=>messages[locale][key]??messages['pt-BR'][key]??key}),[locale,setLocale])
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(){const value=useContext(LocaleContext);if(!value)throw new Error('useLocale must be used within LocaleProvider');return value}

