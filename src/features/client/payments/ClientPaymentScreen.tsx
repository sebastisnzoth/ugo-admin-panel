import React,{useEffect,useRef,useState}from'react'
import{useLocale}from'../../../i18n/locale'
import{useRoleSession}from'../../../mvp/shared'
import{ClientSummaryScreen}from'../request/ClientSummaryScreen'
import{UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import'./clientPaymentScreen.css'
type Method='pix'|'cash'
const toPreference=(method:Method)=>method==='pix'?'pix':'efectivo'
export function ClientPaymentScreen({onBack,onConfirm,onEditNeed,onEditLocation,onEditWhen}:{onBack:()=>void;onConfirm:()=>void;onEditNeed?:()=>void;onEditLocation?:()=>void;onEditWhen?:()=>void}){
 const{t}=useLocale()
 const{session,supabase}=useRoleSession('client'),[method,setMethod]=useState<Method>('cash'),[preferenceError,setPreferenceError]=useState(false),[preferenceAttempt,setPreferenceAttempt]=useState(0),chosen=useRef(false),key=session?`ugo:guided-request-draft:${session.user.id}`:''
 useEffect(()=>{if(!key||!session)return;let alive=true,hasDraft=false;try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');if(d.paymentMethod==='cash'||d.paymentMethod==='pix'){setMethod(d.paymentMethod);hasDraft=true}}catch{/* draft unavailable */}if(hasDraft)return()=>{alive=false};void(async()=>{try{const{data,error}=await supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle();if(error)throw error;if(alive){setPreferenceError(false);if(!chosen.current)setMethod(data?.metodo==='pix'?'pix':'cash')}}catch{if(alive)setPreferenceError(true)}})();return()=>{alive=false}},[key,session,supabase,preferenceAttempt])
 const select=(next:Method)=>{chosen.current=true;setMethod(next);try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...d,paymentMethod:next}))}catch{/* current selection remains in memory */}}
 useEffect(()=>{if(!key)return;const onVoiceDraft=(event:Event)=>{const next=(event as CustomEvent<{paymentMethod?:Method|null}>).detail?.paymentMethod;if(next==='cash'||next==='pix')select(next)};window.addEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft);return()=>window.removeEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft)},[key])
 const confirm=()=>{try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...d,paymentMethod:method}))}catch{/* existing default applies if session storage is unavailable */}void supabase.rpc('set_preorder_payment_preference',{p_metodo:toPreference(method)}).then(({error})=>{if(error)console.warn('UGO payment preference could not be persisted; order continues with draft selection.',error)});onConfirm()}
 if(!session)return null
 const controls=<section className="ugo-review-payment" id="ugo-review-payment" aria-label={t('screen.client_payment.2')}><h2>{t('screen.client_payment.2')}</h2><p>{t('clientJourney.paymentPreferenceHelp')}</p>{preferenceError&&<div className="ugo-payment-preference-warning" role="alert">{t('clientJourney.preferenceLoadError')} <button type="button" onClick={()=>setPreferenceAttempt(value=>value+1)}>{t('clientJourney.retry')}</button></div>}<div className="ugo-review-payment-options" role="group" aria-label={t('screen.client_payment.2')}><button type="button" className={method==='cash'?'selected':''} aria-pressed={method==='cash'} onClick={()=>select('cash')}><b>{t('screen.client_payment.4')}</b><small>{t('screen.client_payment.5')}</small></button><button type="button" className={method==='pix'?'selected':''} aria-pressed={method==='pix'} onClick={()=>select('pix')}><b>{t('screen.client_payment.6')}</b><small>{t('screen.client_payment.7')}</small></button></div></section>
 return <ClientSummaryScreen onBack={onBack} onConfirm={confirm} onEditNeed={onEditNeed} onEditLocation={onEditLocation} onEditWhen={onEditWhen} onEditPayment={()=>document.getElementById('ugo-review-payment')?.scrollIntoView({behavior:'smooth',block:'center'})} paymentControls={controls} paymentMethod={method}/>
}
export default ClientPaymentScreen
