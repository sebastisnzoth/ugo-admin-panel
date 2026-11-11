import React,{useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{useLocale}from'../i18n/locale'

type CollectionMethod='pix'|'efectivo'

/** Choosing a collection method never confirms that money was received. */
export function ProviderPostServiceCollection({serviceId,amount,currency,commission,openDebtCount,approvedAt,selected,onUpdated,onOpenEarnings}:{
 serviceId:string;amount:number;currency:string;commission:number;openDebtCount:number;approvedAt:unknown;selected:unknown;onUpdated:()=>Promise<void>;onOpenEarnings:()=>void
}){
 const{locale}=useLocale()
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')
 const[optimistic,setOptimistic]=useState<CollectionMethod|null>(null)
 const chosen=optimistic||((selected==='pix'||selected==='efectivo')?selected:null)
 const labels=(locale==='pt-BR'?{
  waiting:'Aguardando aprovação do cliente.',title:'Trabalho aprovado',question:'Como o cliente vai pagar?',cash:'Dinheiro',pix:'Pix · QR Code',aria:'Cobro após serviço',
  cashPending:'Dinheiro escolhido. O cliente deve confirmar a entrega; o pagamento ainda não foi registrado como recebido.',
  pixPending:'Pix selecionado, mas não há QR Asaas para este serviço. Nenhum pagamento foi criado nem confirmado.',
  cashDebt:'O cliente confirma o dinheiro após entregar. Só então UGO registra a comissão como dívida.',count:'Comissões UGO em aberto:',debtHelp:'Ao atingir 3 comissões abertas, novos pedidos ficam bloqueados até a conciliação.',openEarnings:'Ver comissões e pagar UGO',commissionLabel:'comissão deste serviço se for dinheiro',qrUnavailable:'O QR Pix Asaas ainda não foi habilitado para este serviço real. Não cobre com Pix sem um QR oficial.',
 }:locale==='en'?{
  waiting:'Waiting for customer approval.',title:'Work approved',question:'How will the customer pay?',cash:'Cash',pix:'Pix · QR Code',aria:'Collection after service',
  cashPending:'Cash selected. Awaiting customer confirmation; no payment was marked received.',
  pixPending:'Pix selected, but no Asaas QR is available for this service. No payment was created or confirmed.',
  cashDebt:'The customer confirms cash after handing it over. Only then does UGO record a commission debt.',count:'Open UGO commissions:',debtHelp:'At 3 open commissions, new jobs are blocked until reconciliation.',openEarnings:'See commissions and pay UGO',commissionLabel:'commission if paid in cash',qrUnavailable:'Asaas Pix QR is not enabled for this real service. Do not charge Pix without an official QR.',
 }:{
  waiting:'Esperando aprobación del cliente.',title:'Trabajo aprobado',question:'¿Cómo va a pagar el cliente?',cash:'Efectivo',pix:'Pix · QR Code',aria:'Cobro al finalizar el servicio',
  cashPending:'Efectivo elegido. Esperando confirmación del cliente; todavía no figura como recibido.',
  pixPending:'Pix elegido, pero no hay QR de Asaas para este servicio. No se creó ni confirmó un pago.',
  cashDebt:'El cliente confirma el efectivo después de entregarlo. Recién entonces UGO registra la deuda de comisión.',count:'Comisiones UGO abiertas:',debtHelp:'Al llegar a 3 comisiones abiertas se bloquean nuevos trabajos hasta conciliar.',openEarnings:'Ver comisiones y pagar UGO',commissionLabel:'comisión de este servicio si es en efectivo',qrUnavailable:'El QR Pix de Asaas todavía no está habilitado para este servicio real. No cobres sin un QR oficial.'
 })
 if(!approvedAt)return <p role="status">{labels.waiting}</p>
 const pick=async(method:CollectionMethod)=>{
  if(busy||chosen===method)return
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
  <p><strong>{new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':'es-AR',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'BRL'}).format(amount)}</strong></p>
  {(!chosen||chosen==='pix')&&<div className="ugo-provider-payment-methods">
   <button type="button" disabled={busy||chosen==='efectivo'} onClick={()=>void pick('efectivo')}>{labels.cash}</button>
   {currency==='BRL'&&!chosen&&<button type="button" disabled aria-disabled="true" title={labels.qrUnavailable}>{labels.pix}</button>}
  </div>}
  {chosen==='efectivo'&&<div role="status"><p>{labels.cashPending}</p><p>{labels.cashDebt}</p></div>}
  {chosen==='pix'&&<div role="status"><p>{labels.pixPending}</p><p>{labels.qrUnavailable}</p></div>}
  <div className="ugo-provider-debt-summary"><p><strong>{labels.count} {openDebtCount}/3</strong></p><p>{labels.debtHelp}</p><p>{new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':'es-AR',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'BRL'}).format(commission)} · {labels.commissionLabel}</p><button type="button" onClick={onOpenEarnings}>{labels.openEarnings}</button></div>
  {error&&<p role="alert">{error}</p>}
 </section>
}
