import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{PaymentTimeline}from'../PaymentTimeline'
import{useProviderData,money}from'./providerData'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'

const STATE_LABEL:Record<string,string>={asignado:'Asignado',en_camino:'En camino',llegado:'En el lugar',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado'}

type NextAction={label:string;disabled:boolean;hint:string;kind:'state'|'cash';state?:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'}

export function ProviderActiveJob(){
 const d=useProviderData(),s=d.service
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen"><span className="provider-kicker">ACTIVIDAD</span><h1>No tenés un trabajo activo</h1><p>Cuando aceptes una oportunidad, vas a seguirla desde acá.</p></section>
 const payment=d.payments.find(p=>p.servicio_id===s.id)||null
 const paymentReady=d.funded||d.cashSelected
 const cashAwaitingReceipt=d.cashSelected&&!d.cashConfirmed
 let action:NextAction|null=null
 if(s.estado==='asignado'&&paymentReady)action={label:'Salir hacia el cliente',state:'en_camino',kind:'state',disabled:false,hint:'Confirmá cuando estés listo para salir.'}
 else if(s.estado==='en_camino')action={label:'Confirmar llegada',state:'llegado',kind:'state',disabled:false,hint:'Usá esta acción cuando estés en la dirección del cliente.'}
 else if(s.estado==='llegado')action={label:'Iniciar servicio',state:'en_progreso',kind:'state',disabled:!evidence.initial,hint:evidence.initial?'La evidencia inicial está lista.':'Primero registrá una evidencia “Antes”.'}
 else if(s.estado==='en_progreso'&&cashAwaitingReceipt)action={label:'Confirmar efectivo recibido',kind:'cash',disabled:!evidence.final,hint:evidence.final?'Confirmá únicamente cuando el cliente ya te haya entregado el efectivo.':'Subí una evidencia “Después” antes de cerrar el trabajo.'}
 else if(s.estado==='en_progreso')action={label:'Finalizar y pedir aprobación',state:'esperando_aprobacion',kind:'state',disabled:!evidence.final,hint:evidence.final?'La evidencia final está lista.':'Subí una evidencia “Después” antes de finalizar.'}
 else if(s.estado==='esperando_aprobacion'&&cashAwaitingReceipt)action={label:'Confirmar efectivo recibido',kind:'cash',disabled:!evidence.final,hint:evidence.final?'Este servicio quedó en un estado anterior incompleto. Confirmá el cobro para habilitar la aprobación del cliente.':'Falta la evidencia final antes de confirmar el cobro.'}
 const displayState=s.estado==='esperando_aprobacion'&&cashAwaitingReceipt?'Cobro pendiente':STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 const runAction=()=>{if(!action)return;if(action.kind==='cash')void d.confirmCash();else if(action.state)void d.advance(action.state)}
 return <section className="provider-screen provider-active-job"><span className="provider-kicker">TRABAJO ACTIVO</span><h1>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h1><article className="provider-card provider-detail"><div className="provider-opportunity-meta"><span className="provider-chip">{displayState}</span><span>Servicio #{s.id}</span></div><p>{s.descripcion}</p><p>📍 {s.direccion_cliente||'Dirección por confirmar'}</p><strong className="provider-price">{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong>{s.estado==='asignado'&&!paymentReady&&<div className="provider-payment-lock">Esperando que el cliente confirme la forma de pago.</div>}{d.funded&&<div className="provider-payment-ok">✓ Pago protegido por UGO.</div>}{cashAwaitingReceipt&&<div className="provider-payment-lock">Pago en efectivo seleccionado. Confirmá la recepción al finalizar; UGO registra el cobro, pero no custodia el dinero.</div>}{d.cashConfirmed&&<div className="provider-payment-ok">✓ Efectivo recibido y registrado.</div>}{s.estado==='esperando_aprobacion'&&!cashAwaitingReceipt&&<div className="provider-payment-ok">✓ Trabajo listo para revisión y aprobación del cliente.</div>}{s.estado==='esperando_aprobacion'&&cashAwaitingReceipt&&<div className="provider-payment-lock">Trabajo terminado. Falta registrar la recepción del efectivo antes de habilitar la aprobación del cliente.</div>}<PaymentTimeline payment={payment} serviceState={s.estado} compact/></article>{action&&<article className="provider-next-step"><small>PRÓXIMO PASO</small><strong>{action.label}</strong><span>{action.hint}</span><button className="provider-primary provider-wide" disabled={d.busy||action.disabled} onClick={runAction}>{d.busy?'Procesando…':action.label}</button></article>}<ProviderEvidencePanel service={s} onReadinessChange={setEvidence}/>{s.estado==='en_progreso'&&!evidence.final&&<ServiceExpansionPanel role="provider" serviceId={s.id} compact/>}</section>
}
