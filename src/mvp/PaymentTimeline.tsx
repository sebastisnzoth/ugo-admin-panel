import React from'react'
import'./payment-timeline.css'

type PaymentLike={
 metodo?:string|null
 estado?:string|null
 modelo_pago?:string|null
 mp_payment_id?:string|null
 pix_e2e_id?:string|null
 pago_externo_id?:string|null
}

type Props={payment:PaymentLike|null|undefined;serviceState?:string|null;compact?:boolean}

type Step={key:string;label:string;done:boolean;current:boolean}

const SERVICE_STARTED=['en_camino','llegado','en_progreso','esperando_aprobacion','completado']

export function PaymentTimeline({payment,serviceState,compact=false}:Props){
 const isCash=payment?.metodo==='efectivo'||payment?.modelo_pago==='presencial'
 const protectedElectronic=Boolean(payment&&payment.estado==='retenido'&&(payment.mp_payment_id||payment.pix_e2e_id||payment.pago_externo_id))
 const electronicReleased=Boolean(payment&&payment.estado==='liberado'&&!isCash)
 const cashConfirmed=Boolean(isCash&&payment?.estado==='liberado')
 const failed=payment?.estado==='fallido'||payment?.estado==='reembolsado'
 let steps:Step[]
 if(isCash){
  const started=Boolean(serviceState&&SERVICE_STARTED.includes(serviceState))
  steps=[
   {key:'selected',label:'Efectivo elegido',done:true,current:!started&&!cashConfirmed},
   {key:'service',label:'Servicio',done:started,current:started&&!cashConfirmed},
   {key:'received',label:'Recepción',done:cashConfirmed,current:cashConfirmed},
   {key:'registered',label:'Registrado',done:cashConfirmed,current:false},
  ]
 }else{
  const hasPayment=Boolean(payment)
  const authorized=payment?.estado==='autorizado'||protectedElectronic||electronicReleased
  steps=[
   {key:'method',label:'Pago online',done:hasPayment,current:!hasPayment},
   {key:'pending',label:'Pendiente',done:hasPayment,current:hasPayment&&!authorized&&!failed},
   {key:'protected',label:'Protegido',done:protectedElectronic||electronicReleased,current:protectedElectronic},
   {key:'released',label:'Liberado',done:electronicReleased,current:electronicReleased},
  ]
 }
 const summary=isCash
  ?cashConfirmed?'Efectivo recibido y registrado.':'Efectivo seleccionado. UGO registra el pago, pero no custodia el dinero.'
  :failed?payment?.estado==='reembolsado'?'Pago reembolsado.':'El pago falló. Podés intentarlo nuevamente.'
  :electronicReleased?'Pago electrónico liberado.':protectedElectronic?'Pago electrónico protegido por UGO.':payment?'Pago electrónico pendiente de confirmación.':'Todavía falta elegir o iniciar la forma de pago.'
 return <section className={`ugo-payment-timeline${compact?' compact':''}`} aria-label="Estado del pago">
  <header><div><small>ESTADO DEL PAGO</small><strong>{isCash?'Efectivo':'Pago electrónico'}</strong></div><span className={failed?'error':cashConfirmed||electronicReleased?'success':protectedElectronic?'protected':'pending'}>{failed?'Revisar':cashConfirmed||electronicReleased?'Listo':protectedElectronic?'Protegido':'En curso'}</span></header>
  <ol>{steps.map(step=><li key={step.key} className={`${step.done?'done ':''}${step.current?'current':''}`.trim()}><i aria-hidden="true">{step.done?'✓':'•'}</i><span>{step.label}</span></li>)}</ol>
  {!compact&&<p>{summary}</p>}
 </section>
}
