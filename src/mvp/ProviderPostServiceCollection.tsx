import React,{useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{useLocale}from'../i18n/locale'

type CollectionMethod='pix'|'efectivo'

/** Choosing a collection method never confirms that money was received. */
export function ProviderPostServiceCollection({serviceId,amount,approvedAt,selected,onUpdated}:{
 serviceId:string;amount:number;approvedAt:unknown;selected:unknown;onUpdated:()=>Promise<void>
}){
 const{locale}=useLocale()
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')
 const[optimistic,setOptimistic]=useState<CollectionMethod|null>(null)
 const chosen=optimistic||((selected==='pix'||selected==='efectivo')?selected:null)
 if(!approvedAt)return <p role="status">{locale==='pt-BR'?'Aguardando aprovação do cliente.':locale==='en'?'Waiting for customer approval.':'Esperando aprobación del cliente.'}</p>
 const pick=async(method:CollectionMethod)=>{
  if(busy||chosen)return
  setError('');setBusy(true)
  try{
   const{error:rpcError}=await getRoleSupabase('provider').rpc('elegir_cobro_post_servicio',{p_servicio_id:serviceId,p_metodo:method})
   if(rpcError)throw rpcError
   setOptimistic(method)
   await onUpdated()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el método de cobro.')}
  finally{setBusy(false)}
 }
 return <section className="ugo-provider-post-service-collection" aria-label="Cobro al finalizar el servicio">
  <h3>{locale==='pt-BR'?'Trabalho aprovado':locale==='en'?'Work approved':'Trabajo aprobado'}</h3>
  <p>{locale==='pt-BR'?'Como o cliente vai pagar?':locale==='en'?'How will the customer pay?':'¿Cómo va a pagar el cliente?'}</p>
  <p><strong>{new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':'es-AR',{style:'currency',currency:'BRL'}).format(amount)}</strong></p>
  {!chosen&&<div className="ugo-provider-payment-methods">
   <button type="button" disabled={busy} onClick={()=>void pick('efectivo')}>{locale==='pt-BR'?'Dinheiro':locale==='en'?'Cash':'Efectivo'}</button>
   <button type="button" disabled={busy} onClick={()=>void pick('pix')}>Pix · QR Code</button>
  </div>}
  {chosen==='efectivo'&&<p role="status">{locale==='pt-BR'?'Dinheiro escolhido. O cliente deve confirmar a entrega; o pagamento ainda não foi registrado como recebido.':locale==='en'?'Cash selected. Awaiting customer confirmation; no payment was marked received.':'Efectivo elegido. Esperando confirmación del cliente; todavía no figura como recibido.'}</p>}
  {chosen==='pix'&&<p role="status">{locale==='pt-BR'?'Pix escolhido. Aguardando QR oficial da integração; nenhum pagamento foi confirmado.':locale==='en'?'Pix selected. Waiting for the official processor QR; no payment confirmed.':'Pix elegido. Pendiente del QR oficial del procesador; ningún pago se confirmó.'}</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
