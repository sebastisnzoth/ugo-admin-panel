import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'

type Method='pix'|'efectivo'
export function ClientPreOrderPayment(){
 const{session,supabase}=useRoleSession('client'),[method,setMethod]=useState<Method>('efectivo'),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{if(!session)return;let alive=true;void supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(alive&&(data?.metodo==='pix'||data?.metodo==='efectivo'))setMethod(data.metodo)});return()=>{alive=false}},[session,supabase])
 if(!session)return null
 const choose=async(next:Method)=>{if(busy||next===method)return;setBusy(true);setMessage('');const{error}=await supabase.rpc('set_preorder_payment_preference',{p_metodo:next});if(error)setMessage('No pudimos guardar la forma de pago.');else setMethod(next);setBusy(false)}
 return <div className="ugo-studio-payment ugo-preorder-payment" aria-label="Forma de pago antes de pedir"><div><span className="material-symbols-outlined">payments</span><b>Forma de pago</b></div><div className="ugo-preorder-payment-options"><button type="button" className={method==='pix'?'selected':''} disabled={busy} onClick={()=>void choose('pix')}>▦ PIX</button><button type="button" className={method==='efectivo'?'selected':''} disabled={busy} onClick={()=>void choose('efectivo')}>💵 Efectivo</button></div><small>{message||'Elegila antes de realizar el pedido. UGO la guarda para el servicio.'}</small></div>
}
