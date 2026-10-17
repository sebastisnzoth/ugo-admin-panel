import{LocalizedText}from'../../../i18n/locale'
import{useLocale}from'../../../i18n/locale'
import React,{useEffect,useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{ClientSummaryScreen}from'../request/ClientSummaryScreen'
import{UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import'./clientPaymentScreen.css'
type Method='pix'|'cash'
const toPreference=(method:Method)=>method==='pix'?'pix':'efectivo'
export function ClientPaymentScreen({onBack,onConfirm}:{onBack:()=>void;onConfirm:()=>void}){
 const{t}=useLocale();
 const{session,supabase}=useRoleSession('client'),[method,setMethod]=useState<Method>('cash'),[summary,setSummary]=useState(false),key=session?`ugo:guided-request-draft:${session.user.id}`:''
 useEffect(()=>{if(!key||!session)return;let alive=true,hasDraft=false;try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');if(d.paymentMethod==='cash'||d.paymentMethod==='pix'){setMethod(d.paymentMethod);hasDraft=true;if(d.voiceJourney)window.setTimeout(()=>setSummary(true),0)}}catch{/* vacío intencional */}if(hasDraft)return()=>{alive=false};void(async()=>{try{const{data}=await supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle();if(alive)setMethod(data?.metodo==='pix'?'pix':'cash')}catch{if(alive)setMethod('cash')}})();return()=>{alive=false}},[key,session,supabase]);useEffect(()=>{if(!key)return;const onVoiceDraft=(event:Event)=>{const detail=(event as CustomEvent<{paymentMethod?:'cash'|'pix'|null;voiceJourney?:boolean}>).detail||{},nextMethod=detail.paymentMethod;if(nextMethod!=='cash'&&nextMethod!=='pix')return;setMethod(nextMethod);try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...d,paymentMethod:nextMethod,voiceJourney:true}))}catch{/* vacío intencional */}setSummary(true);void supabase.rpc('set_preorder_payment_preference',{p_metodo:toPreference(nextMethod)}).then(({error})=>{if(error)console.warn('UGO voice payment preference could not be persisted; order continues.',error)})};window.addEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft);return()=>window.removeEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft)},[key,supabase])
 const next=()=>{try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...d,paymentMethod:method}))}catch{/* vacío intencional */}setSummary(true);void supabase.rpc('set_preorder_payment_preference',{p_metodo:toPreference(method)}).then(({error})=>{if(error)console.warn('UGO payment preference could not be persisted; order continues with draft selection.',error)})}
 if(!session)return null
 if(summary)return <ClientSummaryScreen onBack={()=>setSummary(false)} onConfirm={onConfirm}/>
 return <main className="ugo-payment-screen"><header><button type="button" onClick={onBack}>←</button><strong><LocalizedText id="ugoWebRemaining.brand"/></strong><div><i/><i/><i/><i/><i/></div><small>{t('screen.client_payment.1')}</small></header><section><h1>{t('screen.client_payment.2')}</h1><p>{t('screen.client_payment.3')}</p><button type="button" className={method==='cash'?'selected':''} onClick={()=>setMethod('cash')}><span>💵</span><div><b>{t('screen.client_payment.4')}</b><small>{t('screen.client_payment.5')}</small></div><i/></button><button type="button" className={method==='pix'?'selected':''} onClick={()=>setMethod('pix')}><span>◆</span><div><b>{t('screen.client_payment.6')}</b><small>{t('screen.client_payment.7')}</small></div><i/></button><aside>▣ <span><b>{t('screen.client_payment.8')}</b><small>{t('clientPayment.guarantee')}</small></span></aside></section><footer><button type="button" onClick={next}>{t('screen.client_payment.9')}</button></footer></main>
}
export default ClientPaymentScreen
