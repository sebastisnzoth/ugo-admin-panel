import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{PaymentTimeline}from'../PaymentTimeline'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderWorkAssistant}from'./ProviderWorkAssistant'

const STATE_LABEL:Record<string,string>={asignado:'Asignado',en_camino:'En camino',llegado:'En el lugar',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado'}

type NextAction={label:string;disabled:boolean;hint:string;kind:'state'|'cash';state?:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'}

export function ProviderActiveJob(){
 const d=useProviderData(),flow=useProviderFlow(),s=d.service
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><span className="provider-kicker">ACTIVIDAD</span><h1>No tenés un trabajo activo</h1><p>Cuando aceptes una oportunidad, vas a seguir el servicio completo desde acá.</p><button type="button" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>Ver oportunidades</button><button type="button" className="provider-secondary provider-wide" onClick={flow.actions.openDemand}>Explorar demanda</button></section>
 const payment=d.payments.find(p=>p.servicio_id===s.id)||null
 const paymentReady=d.funded||d.cashSelected
 const cashAwaitingReceipt=d.cashSelected&&!d.cashConfirmed
 let action:NextAction|null=null
 if(s.estado==='asignado'&&paymentReady)action={label:'Salir hacia el cliente',state:'en_camino',kind:'state',disabled:false,hint:'Confirmá cuando estés listo para salir. Desde ahí UGO comparte tu ubicación durante el traslado.'}
 else if(s.estado==='en_camino')action={label:'Marcar que llegué',state:'llegado',kind:'state',disabled:false,hint:'Marcá la llegada cuando estés en el lugar. Si hay ubicación exacta, UGO valida que estés dentro del radio operativo de 200 m.'}
 else if(s.estado==='llegado')action={label:'Iniciar servicio',state:'en_progreso',kind:'state',disabled:!evidence.initial,hint:evidence.initial?'La evidencia “Antes” está registrada. Ya podés iniciar.':'Primero registrá una foto “Antes” real del estado inicial.'}
 else if(s.estado==='en_progreso'&&cashAwaitingReceipt)action={label:'Confirmar efectivo recibido',kind:'cash',disabled:!evidence.final,hint:evidence.final?'Confirmá únicamente cuando el cliente ya te haya entregado el efectivo.':'Subí una evidencia “Después” tomada al finalizar antes de cerrar el trabajo.'}
 else if(s.estado==='en_progreso')action={label:'Finalizar y pedir aprobación',state:'esperando_aprobacion',kind:'state',disabled:!evidence.final,hint:evidence.final?'La evidencia final está lista.':'Subí una evidencia “Después” tomada al finalizar antes de pedir aprobación.'}
 else if(s.estado==='esperando_aprobacion'&&cashAwaitingReceipt)action={label:'Confirmar efectivo recibido',kind:'cash',disabled:!evidence.final,hint:evidence.final?'Este servicio quedó en un estado anterior incompleto. Confirmá el cobro para habilitar la aprobación del cliente.':'Falta la evidencia final antes de confirmar el cobro.'}
 const displayState=s.estado==='esperando_aprobacion'&&cashAwaitingReceipt?'Cobro pendiente':STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 const runAction=()=>{if(!action)return;if(action.kind==='cash')void d.confirmCash();else if(action.state)void d.advance(action.state)}
 return <section className="provider-screen provider-active-job"><span className="provider-kicker">TRABAJO ACTIVO</span><h1>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h1><article className="provider-card provider-detail"><div className="provider-opportunity-meta"><span className="provider-chip">{displayState}</span><span>Servicio #{s.id}</span></div><p>{s.descripcion}</p><p>📍 {s.direccion_cliente||'Dirección por confirmar'}</p><strong className="provider-price">{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong>{s.estado==='asignado'&&!paymentReady&&<div className="provider-payment-lock" role="status">Esperando que el cliente confirme la forma de pago.</div>}{d.funded&&<div className="provider-payment-ok" role="status">✓ Pago protegido por UGO.</div>}{cashAwaitingReceipt&&<div className="provider-payment-lock" role="status">Pago en efectivo seleccionado. Confirmá la recepción al finalizar; UGO registra el cobro, pero no custodia el dinero.</div>}{d.cashConfirmed&&<div className="provider-payment-ok" role="status">✓ Efectivo recibido y registrado.</div>}{s.estado==='esperando_aprobacion'&&!cashAwaitingReceipt&&<div className="provider-payment-ok" role="status">✓ Trabajo listo para revisión y aprobación del cliente.</div>}{s.estado==='esperando_aprobacion'&&cashAwaitingReceipt&&<div className="provider-payment-lock" role="status">Trabajo terminado. Falta registrar la recepción del efectivo antes de habilitar la aprobación del cliente.</div>}<PaymentTimeline payment={payment} serviceState={s.estado} compact/></article>{action&&<article className="provider-next-step"><small>PRÓXIMO PASO</small><strong>{action.label}</strong><span>{action.hint}</span><button className="provider-primary provider-wide" disabled={d.busy||action.disabled} onClick={runAction}>{d.busy?'Procesando…':action.label}</button></article>}<ProviderWorkAssistant service={s} funded={d.funded} cashSelected={d.cashSelected} cashConfirmed={d.cashConfirmed} initialEvidence={evidence.initial} finalEvidence={evidence.final}/><ProviderEvidencePanel service={s} onReadinessChange={setEvidence}/>{s.estado==='en_progreso'&&!evidence.final&&<ServiceExpansionPanel role="provider" serviceId={s.id} compact/>}</section>
}
