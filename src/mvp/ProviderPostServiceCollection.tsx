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
 const labels=(locale==='pt-BR'?{
  waiting:'Aguardando aprovação do cliente.',title:'Trabalho aprovado',question:'Como o cliente vai pagar?',cash:'Dinheiro',pix:'Pix · QR Code',aria:'Cobro após serviço',
  cashPending:'Dinheiro escolhido. O cliente deve confirmar a entrega; o pagamento ainda não foi registrado como recebido.',
  pixPending:'Pix escolhido. Aguardando QR oficial da integração; nenhum pagamento foi confirmado.',
 }:locale==='en'?{
  waiting:'Waiting for customer approval.',title:'Work approved',question:'How will the customer pay?',cash:'Cash',pix:'Pix · QR Code',aria:'Collection after service',
  cashPending:'Cash selected. Awaiting customer confirmation; no payment was marked received.',
  pixPending:'Pix selected. Waiting for the official processor QR; no payment confirmed.',
 }:{
  waiting:'Esperando aprobación del cliente.',title:'Trabajo aprobado',question:'¿Cómo va a pagar el cliente?',cash:'Efectivo',pix:'Pix · QR Code',aria:'Cobro al finalizar el servicio',
  cashPending:'Efectivo elegido. Esperando confirmación del cliente; todavía no figura como recibido.',
  pixPending:'Pix elegido. Pendiente del QR oficial del procesador; ningún pago se confirmó.'
 })
 if(!approvedAt)return <p role="status">{labels.waiting}</p>
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
 return <section className="ugo-provider-post-service-collection" aria-label={labels.aria}>
  <h3>{labels.title}</h3>
  <p>{labels.question}</p>
  <p><strong>{new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':'es-AR',{style:'currency',currency:'BRL'}).format(amount)}</strong></p>
  {!chosen&&<div className="ugo-provider-payment-methods">
   <button type="button" disabled={busy} onClick={()=>void pick('efectivo')}>{labels.cash}</button>
   <button type="button" disabled={busy} onClick={()=>void pick('pix')}>{labels.pix}</button>
  </div>}
  {chosen==='efectivo'&&<p role="status">{labels.cashPending}</p>}
  {chosen==='pix'&&<p role="status">{labels.pixPending}</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
