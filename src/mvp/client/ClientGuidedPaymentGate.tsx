import React,{useEffect,useState}from'react'
import{createPortal}from'react-dom'
import{useRoleSession}from'../shared'

type Method='pix'|'efectivo'

/**
 * P0 contract: payment belongs to the request draft. This gate is rendered
 * inside the existing guided composer and persists only the client's payment
 * preference. It never creates a service or starts dispatch/matching.
 */
export function ClientGuidedPaymentGate(){
 const{session,supabase}=useRoleSession('client')
 const[method,setMethod]=useState<Method|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[target,setTarget]=useState<Element|null>(null)
 useEffect(()=>{if(!session)return;let alive=true;void supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(alive&&(data?.metodo==='pix'||data?.metodo==='efectivo'))setMethod(data.metodo)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{
  let mount:HTMLDivElement|null=null
  const place=()=>{
   const request=document.querySelector('.ugo-guided-request .ugo-guided-step')
   if(!request){setTarget(null);return}
   const primary=Array.from(request.querySelectorAll('button.ugo-guided-primary')).find(button=>/Revisar pedido|Confirmar y buscar profesional/i.test(button.textContent||''))
   if(!primary){setTarget(null);return}
   if(!mount){mount=document.createElement('div');mount.className='ugo-guided-payment-gate-mount'}
   if(mount.parentElement!==request||mount.nextSibling!==primary)request.insertBefore(mount,primary)
   setTarget(mount)
  }
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true})
  return()=>{observer.disconnect();mount?.remove()}
 },[])
 useEffect(()=>{
  const guard=(event:Event)=>{
   const button=(event.target as Element|null)?.closest?.('button.ugo-guided-primary') as HTMLButtonElement|null
   if(!button||!/Revisar pedido|Confirmar y buscar profesional/i.test(button.textContent||''))return
   if(method)return
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setMessage('Elegí cómo vas a pagar antes de continuar.')
  }
  document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true)
 },[method])
 if(!session||!target)return null
 const choose=async(next:Method)=>{if(busy)return;setBusy(true);setMessage('');const{error}=await supabase.rpc('set_preorder_payment_preference',{p_metodo:next});if(error)setMessage('No pudimos guardar la forma de pago. Probá nuevamente.');else{setMethod(next);setMessage('Forma de pago guardada para este pedido.')}setBusy(false)}
 return createPortal(<section className="ugo-guided-payment-gate" aria-label="Forma de pago del pedido"><span className="ugo-guided-payment-label">¿CÓMO VAS A PAGAR?</span><div className="ugo-guided-payment-options"><button type="button" className={method==='pix'?'selected':''} disabled={busy} onClick={()=>void choose('pix')}>▦ PIX</button><button type="button" className={method==='efectivo'?'selected':''} disabled={busy} onClick={()=>void choose('efectivo')}>💵 Efectivo</button></div><small>{message||'Elegí la forma de pago antes del resumen. Todavía no se publica ninguna oferta.'}</small></section>,target)
}

export default ClientGuidedPaymentGate
