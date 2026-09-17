import React,{useCallback,useEffect,useState}from'react'
import{useRoleSession}from'../shared'

type Method='pix'|'efectivo'
type Props={onPreferenceChange?:(method:Method|null,ready:boolean)=>void;compact?:boolean}
export function ClientPreOrderPayment({onPreferenceChange,compact=false}:Props){
 const{session,supabase}=useRoleSession('client'),[method,setMethod]=useState<Method|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=useCallback(async()=>{if(!session){setMethod(null);setReady(true);onPreferenceChange?.(null,true);return}setReady(false);const{data,error}=await supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle();const next=!error&&(data?.metodo==='pix'||data?.metodo==='efectivo')?data.metodo as Method:null;setMethod(next);setReady(true);onPreferenceChange?.(next,true);if(error)setMessage('No pudimos leer tu forma de pago. Reintentá antes de pedir un servicio.')},[onPreferenceChange,session,supabase])
 useEffect(()=>{void load()},[load])
 if(!session)return null
 const choose=async(next:Method)=>{if(busy||next===method)return;setBusy(true);setMessage('');const{error}=await supabase.rpc('set_preorder_payment_preference',{p_metodo:next});if(error){setMessage('No pudimos guardar la forma de pago. No se iniciará ningún pedido.')}else{setMethod(next);onPreferenceChange?.(next,true);setMessage(next==='pix'?'PIX quedó como tu forma de pago para los próximos pedidos.':'Efectivo quedó como tu forma de pago para los próximos pedidos.')}setBusy(false)}
 return <section className={`ugo-preorder-payment${compact?' is-compact':''}${method?' has-method':' needs-method'}`} aria-label="Forma de pago antes del pedido">
  <div className="ugo-preorder-payment-main"><div><span className="material-symbols-outlined">payments</span><div><b>Forma de pago</b><small>{method?'Predefinida antes de buscar profesional':'Obligatoria antes de pedir un servicio'}</small></div></div><div className="ugo-preorder-payment-options"><button type="button" className={method==='pix'?'selected':''} disabled={busy||!ready} onClick={()=>void choose('pix')}>▦ PIX</button><button type="button" className={method==='efectivo'?'selected':''} disabled={busy||!ready} onClick={()=>void choose('efectivo')}>💵 Efectivo</button></div></div>
  <small className="ugo-preorder-payment-help">{!ready?'Cargando forma de pago…':message||(method?'Podés cambiarla acá antes de iniciar otro pedido.':'Elegí PIX o Efectivo. Hasta entonces UGO no inicia la solicitud ni busca profesionales.')}</small>
 </section>
}
