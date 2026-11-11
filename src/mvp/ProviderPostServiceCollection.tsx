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
 const[requestSent,setRequestSent]=useState(false)
 const[requestedTotal,setRequestedTotal]=useState('')
 const[proposalSent,setProposalSent]=useState(false)
 const chosen=optimistic||((selected==='pix'||selected==='efectivo')?selected:null)
 const currencyCode=/^[A-Z]{3}$/.test(currency)?currency:'BRL'
 const money=(value:number)=>new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':locale==='en'?'en-US':'es-AR',{style:'currency',currency:currencyCode}).format(value)
 const writeChat=async(message:string,source:string)=>{
  const sb=getRoleSupabase('provider')
  const{data:auth,error:authError}=await sb.auth.getUser()
  if(authError||!auth.user)throw authError||new Error('Sesión no disponible')
  const{data:owned,error:ownedError}=await sb.from('servicios').select('id,estado,proveedor_id').eq('id',serviceId).eq('proveedor_id',auth.user.id).maybeSingle()
  if(ownedError||!owned||owned.estado!=='esperando_aprobacion')throw ownedError||new Error('Este trabajo ya cambió de estado.')
  const attempt=globalThis.crypto?.randomUUID?.()||String(Date.now())
  const{error:sendError}=await sb.from('mensajes').insert({
   servicio_id:serviceId,emisor_id:auth.user.id,emisor_rol:'proveedor',
   contenido:message,datos:{source,clientMessageId:attempt}
  })
  if(!sendError)return
  const{data:stored}=await sb.from('mensajes').select('id').eq('servicio_id',serviceId).eq('emisor_id',auth.user.id).contains('datos',{clientMessageId:attempt}).maybeSingle()
  if(!stored)throw sendError
 }
 const requestCashConfirmation=async()=>{
  if(busy||requestSent||chosen!=='efectivo')return
  setBusy(true);setError('')
  try{
   const message=locale==='pt-BR'
    ?`O pagamento em dinheiro de ${money(amount)} pelo serviço está aguardando sua confirmação no UGO. Confirme apenas depois de entregar o valor.`
    :locale==='en'
     ?`The cash payment of ${money(amount)} is awaiting your confirmation in UGO. Please confirm only after handing over the cash.`
     :`El cobro en efectivo de ${money(amount)} está esperando tu confirmación en UGO. Confirmá únicamente después de entregar el dinero.`
   await writeChat(message,'cash_confirmation_request')
   setRequestSent(true)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar la solicitud.')}
  finally{setBusy(false)}
 }
 const requestAdditionalQuote=async()=>{
  if(busy)return
  const parsed=Number(requestedTotal.replace(',','.'))
  if(!Number.isFinite(parsed)||parsed<=0||Math.abs(parsed-amount)<0.005){
   setError(labels.invalidAmount);return
  }
  setBusy(true);setError('')
  try{
   const message=locale==='pt-BR'
    ?`Proposta de ajuste por trabalho adicional: valor original ${money(amount)}, novo total proposto ${money(parsed)}. Confirme pelo chat. Esse valor ainda NÃO está aprovado nem disponível para pagamento no UGO.`
    :locale==='en'
     ?`Additional-work quote: original total ${money(amount)}, proposed total ${money(parsed)}. Please respond in chat. This amount is NOT yet approved or available for payment in UGO.`
     :`Propuesta por trabajo adicional: total original ${money(amount)}, nuevo total propuesto ${money(parsed)}. Confirmá por chat. Este monto todavía NO está aprobado ni habilitado para cobrar en UGO.`
   await writeChat(message,'post_service_extra_quote')
   setProposalSent(true)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar la propuesta.')}
  finally{setBusy(false)}
 }

 const labels=(locale==='pt-BR'?{
  waiting:'Aguardando aprovação do cliente.',title:'Trabalho aprovado',question:'Como o cliente vai pagar?',cash:'Dinheiro',pix:'Pix · QR Code',aria:'Cobro após serviço',
  cashPending:'Dinheiro escolhido. O cliente deve confirmar a entrega; o pagamento ainda não foi registrado como recebido.',cashAction:'Solicitar confirmação ao cliente',cashRequested:'Pedido enviado no chat. Aguarde a confirmação do cliente em UGO.',extraTitle:'Trabalho adicional fora do orçamento?',extraLabel:'Total proposto (R$)',extraAction:'Enviar proposta para aprovação',extraNote:'A proposta é enviada pelo chat. Não altera o valor do serviço nem gera Pix até aprovação formal no UGO.',proposalSent:'Proposta enviada. O valor original continua sendo o único valor aprovado.',invalidAmount:'Informe um total positivo diferente do valor atual.',
  pixPending:'Pix selecionado, mas não há QR Asaas para este serviço. Nenhum pagamento foi criado nem confirmado.',
  cashDebt:'O cliente confirma o dinheiro após entregar. Só então UGO registra a comissão como dívida.',count:'Comissões UGO em aberto:',debtHelp:'Ao atingir 3 comissões abertas, novos pedidos ficam bloqueados até a conciliação.',openEarnings:'Ver comissões e pagar UGO',commissionLabel:'comissão deste serviço se for dinheiro',qrUnavailable:'O QR Pix Asaas ainda não foi habilitado para este serviço real. Não cobre com Pix sem um QR oficial.',
 }:locale==='en'?{
  waiting:'Waiting for customer approval.',title:'Work approved',question:'How will the customer pay?',cash:'Cash',pix:'Pix · QR Code',aria:'Collection after service',
  cashPending:'Cash selected. Awaiting customer confirmation; no payment was marked received.',cashAction:'Ask customer to confirm',cashRequested:'Request sent in chat. Await the customer confirmation in UGO.',extraTitle:'Additional work outside the original quote?',extraLabel:'Proposed total',extraAction:'Send quote for approval',extraNote:'The quote is sent through chat. It does not change the service price or generate Pix until formally approved in UGO.',proposalSent:'Quote sent. The original amount remains the only approved amount.',invalidAmount:'Enter a positive total different from the current amount.',
  pixPending:'Pix selected, but no Asaas QR is available for this service. No payment was created or confirmed.',
  cashDebt:'The customer confirms cash after handing it over. Only then does UGO record a commission debt.',count:'Open UGO commissions:',debtHelp:'At 3 open commissions, new jobs are blocked until reconciliation.',openEarnings:'See commissions and pay UGO',commissionLabel:'commission if paid in cash',qrUnavailable:'Asaas Pix QR is not enabled for this real service. Do not charge Pix without an official QR.',
 }:{
  waiting:'Esperando aprobación del cliente.',title:'Trabajo aprobado',question:'¿Cómo va a pagar el cliente?',cash:'Efectivo',pix:'Pix · QR Code',aria:'Cobro al finalizar el servicio',
  cashPending:'Efectivo elegido. Esperando confirmación del cliente; todavía no figura como recibido.',cashAction:'Solicitar confirmación al cliente',cashRequested:'Solicitud enviada por chat. Esperá la confirmación del cliente en UGO.',extraTitle:'¿Hubo trabajo adicional fuera del presupuesto?',extraLabel:'Total propuesto',extraAction:'Enviar propuesta para aprobación',extraNote:'Se envía la propuesta por chat. No modifica el precio del servicio ni genera Pix hasta que UGO valide la aprobación.',proposalSent:'Propuesta enviada. El importe original sigue siendo el único aprobado.',invalidAmount:'Ingresá un total positivo diferente del actual.',
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
  {chosen==='efectivo'&&<div role="status"><p>{labels.cashPending}</p><p>{labels.cashDebt}</p><button type="button" disabled={busy||requestSent} onClick={()=>void requestCashConfirmation()}>{busy?labels.cashAction:requestSent?labels.cashRequested:labels.cashAction}</button></div>}
  {chosen==='pix'&&<div role="status"><p>{labels.pixPending}</p><p>{labels.qrUnavailable}</p></div>}
  <div className="ugo-provider-debt-summary"><p><strong>{labels.count} {openDebtCount}/3</strong></p><p>{labels.debtHelp}</p><p>{new Intl.NumberFormat(locale==='pt-BR'?'pt-BR':'es-AR',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'BRL'}).format(commission)} · {labels.commissionLabel}</p><button type="button" onClick={onOpenEarnings}>{labels.openEarnings}</button></div>
  <details className="ugo-provider-extra-quote"><summary>{labels.extraTitle}</summary>
   <label>{labels.extraLabel}<input type="number" min="0.01" step="0.01" inputMode="decimal" value={requestedTotal} onChange={e=>{setRequestedTotal(e.target.value);setProposalSent(false)}} placeholder={amount.toFixed(2)}/></label>
   <p>{labels.extraNote}</p>
   <button type="button" disabled={busy||proposalSent} onClick={()=>void requestAdditionalQuote()}>{proposalSent?labels.proposalSent:labels.extraAction}</button>
  </details>
  {error&&<p role="alert">{error}</p>}
 </section>
}
