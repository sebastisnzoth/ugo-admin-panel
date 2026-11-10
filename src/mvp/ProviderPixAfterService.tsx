import React from 'react'

/**
 * Presentation-only QR Pix screen shown on the PROVIDER phone after a service
 * is completed. This component intentionally has no network requests, secrets,
 * local storage or payment-state mutations. A trusted server owns auth, service
 * ownership, Asaas QR issuance, and payment verification.
 * Not mounted in Arena PROD.
 */
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

export function ProviderPixAfterService({
  payment,onRefresh,onCopy,
}:{
  payment:ProviderPixView
  onRefresh?:()=>void
  onCopy?:(code:string)=>void
}){
  const {stage,amountBRL}=payment
  const money=Number.isFinite(amountBRL)&&amountBRL>0
    ?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amountBRL)
    :null
  const payable=stage==='awaiting_payment'||stage==='confirming'
  const qrValid=typeof payment.qrImageBase64==='string'&&
    /^[A-Za-z0-9+/]+={0,2}$/.test(payment.qrImageBase64)&&
    payment.qrImageBase64.length<=200000
  const pixValid=typeof payment.qrCopyPaste==='string'&&payment.qrCopyPaste.length>0
  return <section className="ugo-provider-pix-after-service"
    aria-label="Pagamento Pix após o serviço" aria-live="polite">
    <h2>Pagamento do serviço</h2>
    {stage==='not_finished'?<p>Finalize o serviço para liberar a cobrança Pix.</p>:
     stage==='loading'?<p>Preparando o pagamento com segurança…</p>:
     stage==='received'?<div role="status"><strong>Pagamento recebido!</strong>
       <p>Asaas confirmou o pagamento. Não apresente o QR novamente.</p></div>:
     stage==='expired'?<div role="status"><strong>Cobrança expirada.</strong>
       <p>É necessário verificar a cobrança antes de gerar outra.</p></div>:
     stage==='error'?<div role="alert"><strong>Não foi possível verificar o pagamento.</strong>
       <p>{payment.message||'Tente consultar o status novamente.'}</p></div>:
     payable?<div className="ugo-provider-pix-payment">
       <p>Mostre este QR Code ao cliente para pagar com o aplicativo do banco.</p>
       {money&&<p><strong>{money}</strong></p>}
       {qrValid?<img alt="QR Code Pix para pagamento do serviço"
         width={240} height={240}
         src={`data:image/png;base64,${payment.qrImageBase64}`}/>:
        <p role="alert">QR Code indisponível. Verifique a cobrança.</p>}
       {pixValid&&<button type="button"
         onClick={()=>onCopy?.(payment.qrCopyPaste!)}
         disabled={!onCopy}>Copiar código Pix</button>}
       <p role="status">{stage==='confirming'
         ?'Verificando a confirmação no Asaas…'
         :'Aguardando o pagamento do cliente…'}</p>
       <p>Não é necessário que o cliente confirme manualmente na UGO.</p>
     </div>:null}
    {(stage==='awaiting_payment'||stage==='confirming'||stage==='error')&&
      onRefresh&&<button type="button" onClick={onRefresh}>Atualizar status</button>}
    <p><small>O serviço só será marcado como pago após confirmação verificada no Asaas.
      O pagamento ao profissional é uma etapa separada.</small></p>
  </section>
}
