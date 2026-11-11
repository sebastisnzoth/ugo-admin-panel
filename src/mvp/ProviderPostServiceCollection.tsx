import React,{useEffect,useState}from'react'
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
 const[pixDetailsOpen,setPixDetailsOpen]=useState(false)
 const[pixCode,setPixCode]=useState('')
 const[pixImage,setPixImage]=useState('')
 const[pixLoading,setPixLoading]=useState(false)
 const[pixCopyStatus,setPixCopyStatus]=useState('')
 const chosen=optimistic||((selected==='pix'||selected==='efectivo')?selected:null)
 useEffect(()=>{
  if(!pixDetailsOpen)return
  let active=true
  const fetchExisting=async()=>{
   setPixLoading(true);setPixCode('');setPixImage('');setPixCopyStatus('')
   try{
    const sb=getRoleSupabase('provider')
    const{data:auth,error:authError}=await sb.auth.getUser()
    if(authError||!auth.user)throw authError||new Error('Session required')
    const{data:owned,error:ownershipError}=await sb.from('servicios').select('id').eq('id',serviceId).eq('proveedor_id',auth.user.id).maybeSingle()
    if(ownershipError||!owned)throw ownershipError||new Error('Service not authorized')
    const{data:payments,error:readError}=await sb.from('pagos')
     .select('metodo,estado,procesador,monto_bruto,pix_copia_cola,pix_qr_code,pix_expira_at')
     .eq('servicio_id',serviceId).in('metodo',['pix','pix_direto','openpix']).limit(2)
    if(readError)throw readError
    if((payments||[]).length===1){
     const row=payments![0]
     const validAmount=Math.abs(Number(row.monto_bruto)-amount)<0.009
     const validStatus=row.estado==='pendiente'&&row.procesador==='asaas'
     const notExpired=!row.pix_expira_at||(Number.isFinite(Date.parse(row.pix_expira_at))&&Date.parse(row.pix_expira_at)>Date.now())
     const code=String(row.pix_copia_cola||'')
     const image=String(row.pix_qr_code||'').replace(/^data:image\/png;base64,/, '')
     if(validAmount&&validStatus&&notExpired&&code.length>35&&code.length<4096&&active){
      setPixCode(code)
      if(/^[A-Za-z0-9+/]+={0,2}$/.test(image)&&image.length<200000)setPixImage(image)
     }
    }
   }catch{/* Never display a QR without validated, readable service payment. */}
   finally{if(active)setPixLoading(false)}
  }
  void fetchExisting()
  return()=>{active=false}
 },[pixDetailsOpen,serviceId,amount])

 const copyExistingPix=async()=>{
  if(!pixCode)return
  try{await navigator.clipboard.writeText(pixCode);setPixCopyStatus(labels.copyOk)}
  catch{setPixCopyStatus(labels.copyError)}
 }
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
  cashDebt:'O cliente confirma o dinheiro após entregar. Só então UGO registra a comissão como dívida.',count:'Comissões UGO em aberto:',debtHelp:'Ao atingir 3 comissões abertas, novos pedidos ficam bloqueados até a conciliação.',openEarnings:'Ver comissões e pagar UGO',commissionLabel:'comissão deste serviço se for dinheiro',qrUnavailable:'Cobrança Pix Asaas ainda não configurada para pedidos reais. Nenhum código ou débito foi criado.',pixAction:'Ver opções do Pix',pixTitle:'Cobrar com Pix',pixHelp:'UGO precisa de uma integração Asaas de produção para emitir o QR real. O valor do trabalho continua registrado, mas não está pago.',pixClose:'Fechar',copyPix:'Copiar Pix',copyOk:'Código Pix copiado',copyError:'Não foi possível copiar. Selecione o código manualmente.',pixLoading:'Consultando cobrança existente…',pendingTag:'Aguardando pagamento',cashSubtitle:'O cliente entrega o dinheiro e confirma no próprio aplicativo.',changeToCash:'Trocar para dinheiro',
 }:locale==='en'?{
  waiting:'Waiting for customer approval.',title:'Work approved',question:'How will the customer pay?',cash:'Cash',pix:'Pix · QR Code',aria:'Collection after service',
  cashPending:'Cash selected. Awaiting customer confirmation; no payment was marked received.',cashAction:'Ask customer to confirm',cashRequested:'Request sent in chat. Await the customer confirmation in UGO.',extraTitle:'Additional work outside the original quote?',extraLabel:'Proposed total',extraAction:'Send quote for approval',extraNote:'The quote is sent through chat. It does not change the service price or generate Pix until formally approved in UGO.',proposalSent:'Quote sent. The original amount remains the only approved amount.',invalidAmount:'Enter a positive total different from the current amount.',
  pixPending:'Pix selected, but no Asaas QR is available for this service. No payment was created or confirmed.',
  cashDebt:'The customer confirms cash after handing it over. Only then does UGO record a commission debt.',count:'Open UGO commissions:',debtHelp:'At 3 open commissions, new jobs are blocked until reconciliation.',openEarnings:'See commissions and pay UGO',commissionLabel:'commission if paid in cash',qrUnavailable:'Asaas Pix payments are not yet configured for real services. No code or charge was created.',pixAction:'View Pix options',pixTitle:'Charge with Pix',pixHelp:'UGO needs a production Asaas integration to issue an official QR. The job amount is recorded but not paid.',pixClose:'Close',copyPix:'Copy Pix',copyOk:'Pix code copied',copyError:'Could not copy. Select the code manually.',pixLoading:'Checking existing payment…',pendingTag:'Payment pending',cashSubtitle:'Customer hands over the cash and confirms in their own app.',changeToCash:'Switch to cash',
 }:{
  waiting:'Esperando aprobación del cliente.',title:'Trabajo aprobado',question:'¿Cómo va a pagar el cliente?',cash:'Efectivo',pix:'Pix · QR Code',aria:'Cobro al finalizar el servicio',
  cashPending:'Efectivo elegido. Esperando confirmación del cliente; todavía no figura como recibido.',cashAction:'Solicitar confirmación al cliente',cashRequested:'Solicitud enviada por chat. Esperá la confirmación del cliente en UGO.',extraTitle:'¿Hubo trabajo adicional fuera del presupuesto?',extraLabel:'Total propuesto',extraAction:'Enviar propuesta para aprobación',extraNote:'Se envía la propuesta por chat. No modifica el precio del servicio ni genera Pix hasta que UGO valide la aprobación.',proposalSent:'Propuesta enviada. El importe original sigue siendo el único aprobado.',invalidAmount:'Ingresá un total positivo diferente del actual.',
  pixPending:'Pix elegido, pero no hay QR de Asaas para este servicio. No se creó ni confirmó un pago.',
  cashDebt:'El cliente confirma el efectivo después de entregarlo. Recién entonces UGO registra la deuda de comisión.',count:'Comisiones UGO abiertas:',debtHelp:'Al llegar a 3 comisiones abiertas se bloquean nuevos trabajos hasta conciliar.',openEarnings:'Ver comisiones y pagar UGO',commissionLabel:'comisión de este servicio si es en efectivo',qrUnavailable:'Los cobros Pix Asaas todavía no están configurados para servicios reales. No se creó ningún QR ni cobro.',pixAction:'Ver opciones Pix',pixTitle:'Cobrar con Pix',pixHelp:'UGO necesita la integración productiva de Asaas para emitir un QR oficial. El importe está registrado, pero no pagado.',pixClose:'Cerrar',copyPix:'Copiar Pix',copyOk:'Código Pix copiado',copyError:'No se pudo copiar. Seleccioná el código manualmente.',pixLoading:'Consultando cobro existente…',pendingTag:'Pago pendiente',cashSubtitle:'El cliente entrega el efectivo y lo confirma desde su aplicación.',changeToCash:'Cambiar a efectivo'
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
  <div className="ugo-collection-header">
   <div><span className="ugo-collection-eyebrow">{labels.title}</span><h3>{labels.question}</h3></div>
   <span className="ugo-collection-status" role="status"><span className="ugo-collection-status-dot" />{labels.pendingTag}</span>
  </div>
  <div className="ugo-collection-amount"><span>{currencyCode}</span><strong>{money(amount)}</strong></div>
  <div className="ugo-collection-methods" role="group" aria-label={labels.question}>
   <button type="button" className={`ugo-collection-method ${chosen==='efectivo'?'is-selected':''}`} aria-pressed={chosen==='efectivo'} disabled={busy||chosen==='efectivo'}
    onClick={()=>void pick('efectivo')}>
    <span className="ugo-collection-method-icon" aria-hidden="true">＄</span><span><strong>{labels.cash}</strong><small>{labels.cashSubtitle}</small></span><span className="ugo-collection-check" aria-hidden="true">{chosen==='efectivo'?'✓':'›'}</span>
   </button>
   {currencyCode==='BRL'&&<button type="button" className={`ugo-collection-method ${chosen==='pix'?'is-selected':''}`} aria-pressed={chosen==='pix'}
    onClick={()=>setPixDetailsOpen(true)}>
    <span className="ugo-collection-method-icon ugo-collection-method-pix" aria-hidden="true">◆</span><span><strong>{labels.pix}</strong><small>{labels.pixHelp}</small></span><span className="ugo-collection-check" aria-hidden="true">›</span>
   </button>}
  </div>
  {chosen==='efectivo'&&<div className="ugo-collection-step" role="status">
   <div className="ugo-collection-step-head"><span aria-hidden="true">✓</span><strong>{labels.cashPending}</strong></div>
   <p>{labels.cashDebt}</p>
   <button type="button" className="ugo-collection-action" disabled={busy||requestSent} onClick={()=>void requestCashConfirmation()}>
    {requestSent?labels.cashRequested:labels.cashAction}
   </button>
  </div>}
  {chosen==='pix'&&<div className="ugo-collection-step" role="status">
   <div className="ugo-collection-step-head"><span aria-hidden="true">◆</span><strong>{labels.pixPending}</strong></div>
   <button type="button" className="ugo-collection-secondary-action" onClick={()=>setPixDetailsOpen(true)}>{labels.pixAction}</button>
   <button type="button" className="ugo-collection-secondary-action" disabled={busy} onClick={()=>void pick('efectivo')}>{labels.changeToCash}</button>
  </div>}
  <div className="ugo-collection-debt">
   <div className="ugo-collection-debt-head"><span>{labels.count}</span><strong>{Math.min(Math.max(0,openDebtCount),3)}/3</strong></div>
   <div className="ugo-collection-meter" role="progressbar" aria-label={labels.count} aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(Math.max(0,openDebtCount),3)}><span style={{width:`${Math.min(Math.max(0,openDebtCount),3)/3*100}%`}} /></div>
   <p>{labels.debtHelp}</p>
   <p>{money(commission)} · {labels.commissionLabel}</p>
   <button type="button" className="ugo-collection-secondary-action" onClick={onOpenEarnings}>{labels.openEarnings} <span aria-hidden="true">↗</span></button>
  </div>
  <details className="ugo-provider-extra-quote">
   <summary>{labels.extraTitle}</summary>
   <div className="ugo-collection-quote-fields">
    <label>{labels.extraLabel}<input type="number" min="0.01" step="0.01" inputMode="decimal" value={requestedTotal} onChange={e=>{setRequestedTotal(e.target.value);setProposalSent(false)}} placeholder={amount.toFixed(2)}/></label>
    <p>{labels.extraNote}</p>
    <button type="button" className="ugo-collection-action" disabled={busy||proposalSent} onClick={()=>void requestAdditionalQuote()}>{proposalSent?labels.proposalSent:labels.extraAction}</button>
   </div>
  </details>
  {error&&<p className="ugo-collection-error" role="alert">{error}</p>}
  {pixDetailsOpen&&<div className="ugo-collection-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPixDetailsOpen(false)}}>
   <div className="ugo-collection-modal" role="dialog" aria-modal="true" aria-label={labels.pixTitle}>
    <button type="button" className="ugo-collection-modal-close" aria-label={labels.pixClose} onClick={()=>setPixDetailsOpen(false)}>×</button>
    <div className="ugo-collection-modal-icon" aria-hidden="true">◆</div><h3>{labels.pixTitle}</h3>
    <div className="ugo-collection-modal-total">{money(amount)}</div>
    {pixLoading?<p role="status">{labels.pixLoading}</p>:
      pixCode?<div className="ugo-collection-modal-pay">
       {pixImage&&<img src={`data:image/png;base64,${pixImage}`} alt={labels.pix} width={210} height={210}/>}
       <textarea readOnly aria-label={labels.copyPix} value={pixCode} rows={3}/>
       <button type="button" className="ugo-collection-action" onClick={()=>void copyExistingPix()}>{labels.copyPix}</button>
       {pixCopyStatus&&<p role="status">{pixCopyStatus}</p>}
      </div>:<><p role="status">{labels.qrUnavailable}</p><p>{labels.pixHelp}</p></>}
    <button type="button" className="ugo-collection-secondary-action" onClick={()=>setPixDetailsOpen(false)}>{labels.pixClose}</button>
   </div>
  </div>}
 </section>
}
