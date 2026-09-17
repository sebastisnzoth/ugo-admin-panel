import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'
import{ClientSummaryScreen}from'./ClientSummaryScreen'
import'./client-payment-screen.css'
type Method='pix'|'cash'
const toPreference=(method:Method)=>method==='pix'?'pix':'efectivo'
export function ClientPaymentScreen({onBack,onConfirm}:{onBack:()=>void;onConfirm:()=>void}){
 const{session,supabase}=useRoleSession('client'),[method,setMethod]=useState<Method>('cash'),[summary,setSummary]=useState(false),key=session?`ugo:guided-request-draft:${session.user.id}`:''
 useEffect(()=>{if(!key||!session)return;let alive=true,hasDraft=false;try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');if(d.paymentMethod==='cash'||d.paymentMethod==='pix'){setMethod(d.paymentMethod);hasDraft=true}}catch{}if(hasDraft)return()=>{alive=false};void supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(!alive)return;setMethod(data?.metodo==='pix'?'pix':'cash')}).catch(()=>{if(alive)setMethod('cash')});return()=>{alive=false}},[key,session,supabase])
 const next=()=>{try{const d=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...d,paymentMethod:method}))}catch{}setSummary(true);void supabase.rpc('set_preorder_payment_preference',{p_metodo:toPreference(method)}).then(({error})=>{if(error)console.warn('UGO payment preference could not be persisted; order continues with draft selection.',error)})}
 if(!session)return null
 if(summary)return <ClientSummaryScreen onBack={()=>setSummary(false)} onConfirm={onConfirm}/>
 return <main className="ugo-payment-screen"><header><button type="button" onClick={onBack}>←</button><strong>UGO</strong><div><i/><i/><i/><i/><i/></div><small>4 de 5</small></header><section><h1>¿Cómo vas a pagar?</h1><p>Seguro y simple, como Uber</p><button type="button" className={method==='cash'?'selected':''} onClick={()=>setMethod('cash')}><span>💵</span><div><b>Efectivo</b><small>Predeterminado · pagás al profesional</small></div><i/></button><button type="button" className={method==='pix'?'selected':''} onClick={()=>setMethod('pix')}><span>◆</span><div><b>PIX</b><small>Pago digital</small></div><i/></button><aside>▣ <span><b>Podés cambiarlo antes de confirmar</b><small>la forma de pago nunca bloquea que empieces el pedido</small></span></aside></section><footer><button type="button" onClick={next}>Continuar →</button></footer></main>
}
export default ClientPaymentScreen
