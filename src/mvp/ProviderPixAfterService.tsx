import React from 'react'
import {useLocale} from '../i18n/locale'

/** Preview-only presentation. Trusted backend owns all payment transitions. */
export type ProviderPixStage =
 | 'not_finished' | 'loading' | 'awaiting_payment'
 | 'confirming' | 'received' | 'expired' | 'error'
export type ProviderPixView = {
 stage: ProviderPixStage
 amountBRL: number
 paymentId?: string
 qrImageBase64?: string
 qrCopyPaste?: string
 expiresAt?: string | null
 message?: string
}
const COPY={
 'pt-BR':{
  label:'Pagamento Pix após o serviço',
  title:'Pagamento do serviço',
  unfinished:'Finalize o serviço para liberar a cobrança Pix.',
  loading:'Preparando o pagamento com segurança…',
  received:'Pagamento recebido!',
  receivedDetail:'Asaas confirmou o pagamento. Não apresente o QR novamente.',
  expired:'Cobrança expirada.',
  expiredDetail:'É necessário verificar a cobrança antes de gerar outra.',
  error:'Não foi possível verificar o pagamento.',
  errorHelp:'Tente consultar o status novamente.',
  instructions:'Mostre este QR Code ao cliente para pagar com o aplicativo do banco.',
  qrAlt:'QR Code Pix para pagamento do serviço',
  qrMissing:'QR Code indisponível. Verifique a cobrança.',
  copy:'Copiar código Pix',
  confirming:'Verificando a confirmação no Asaas…',
  pending:'Aguardando o pagamento do cliente…',
  manual:'Não é necessário que o cliente confirme manualmente na UGO.',
  refresh:'Atualizar status',
  disclaimer:'O serviço só será marcado como pago após confirmação verificada no Asaas. O pagamento ao profissional é uma etapa separada.'
 },
 es:{
  label:'Pago Pix después del servicio',
  title:'Pago del servicio',
  unfinished:'Finalizá el trabajo para habilitar el cobro Pix.',
  loading:'Preparando el cobro de forma segura…',
  received:'¡Pago recibido!',
  receivedDetail:'Asaas confirmó el pago. No vuelvas a mostrar el QR.',
  expired:'Cobro vencido.',
  expiredDetail:'Hay que verificar el cobro antes de generar otro.',
  error:'No pudimos verificar el pago.',
  errorHelp:'Consultá nuevamente el estado.',
  instructions:'Mostrale este QR al cliente para pagar desde su banco.',
  qrAlt:'Código QR Pix para pagar el servicio',
  qrMissing:'QR no disponible. Verificá el cobro.',
  copy:'Copiar código Pix',
  confirming:'Verificando la confirmación en Asaas…',
  pending:'Esperando el pago del cliente…',
  manual:'No hace falta que el cliente confirme manualmente en UGO.',
  refresh:'Actualizar estado',
  disclaimer:'Solo Asaas puede confirmar el pago. Pagar al proveedor es una operación separada.'
 },
 en:{
  label:'Pix payment after service',
  title:'Service payment',
  unfinished:'Finish the service before generating the Pix charge.',
  loading:'Preparing your payment securely…',
  received:'Payment received!',
  receivedDetail:'Asaas confirmed payment. Do not show the QR again.',
  expired:'Payment expired.',
  expiredDetail:'Verify the existing charge before generating another.',
  error:'Could not verify payment.',
  errorHelp:'Try checking payment status again.',
  instructions:'Show this QR to your customer to pay from their banking app.',
  qrAlt:'Pix QR code for service payment',
  qrMissing:'QR code unavailable. Verify the charge.',
  copy:'Copy Pix code',
  confirming:'Checking Asaas payment confirmation…',
  pending:'Waiting for customer payment…',
  manual:'The customer does not need to confirm payment manually in UGO.',
  refresh:'Refresh status',
  disclaimer:'A service is marked paid only after verified Asaas confirmation. Provider payout is a separate step.'
 }
} as const

export function ProviderPixAfterService({
 payment,onRefresh,onCopy,
}:{
 payment:ProviderPixView
 onRefresh?:()=>void
 onCopy?:(code:string)=>void
}){
 const {locale}=useLocale()
 const t=COPY[locale==='es'?'es':locale==='en'?'en':'pt-BR']
 const {stage,amountBRL}=payment
 const money=Number.isFinite(amountBRL)&&amountBRL>0
   ?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amountBRL):null
 const payable=stage==='awaiting_payment'||stage==='confirming'
 const qrValid=typeof payment.qrImageBase64==='string'&&
   /^[A-Za-z0-9+/]+={0,2}$/.test(payment.qrImageBase64)&&
   payment.qrImageBase64.length<=200000
 const pixValid=typeof payment.qrCopyPaste==='string'&&payment.qrCopyPaste.length>0
 return <section className="ugo-provider-pix-after-service"
   aria-label={t.label} aria-live="polite">
   <h2>{t.title}</h2>
   {stage==='not_finished'?<p>{t.unfinished}</p>:
    stage==='loading'?<p>{t.loading}</p>:
    stage==='received'?<div role="status"><strong>{t.received}</strong><p>{t.receivedDetail}</p></div>:
    stage==='expired'?<div role="status"><strong>{t.expired}</strong><p>{t.expiredDetail}</p></div>:
    stage==='error'?<div role="alert"><strong>{t.error}</strong><p>{payment.message||t.errorHelp}</p></div>:
    payable?<div className="ugo-provider-pix-payment">
      <p>{t.instructions}</p>
      {money&&<p><strong>{money}</strong></p>}
      {qrValid?<img alt={t.qrAlt} width={240} height={240}
        src={`data:image/png;base64,${payment.qrImageBase64}`}/>:
       <p role="alert">{t.qrMissing}</p>}
      {pixValid&&<button type="button" onClick={()=>onCopy?.(payment.qrCopyPaste!)}
        disabled={!onCopy}>{t.copy}</button>}
      <p role="status">{stage==='confirming'?t.confirming:t.pending}</p>
      <p>{t.manual}</p>
    </div>:null}
   {(stage==='awaiting_payment'||stage==='confirming'||stage==='error')&&onRefresh&&
      <button type="button" onClick={onRefresh}>{t.refresh}</button>}
   <p><small>{t.disclaimer}</small></p>
 </section>
}
