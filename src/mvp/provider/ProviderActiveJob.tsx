import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{PaymentTimeline}from'../PaymentTimeline'
import{useProviderData,money}from'./providerData'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'

export function ProviderActiveJob(){
 const d=useProviderData(),s=d.service
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen"><span className="provider-kicker">TRABAJO ACTIVO</span><h1>No tenés una misión activa</h1><p>Cuando aceptes una oportunidad, vas a seguirla desde acá.</p></section>
 const payment=d.payments.find(p=>p.servicio_id===s.id)||null
 const paymentReady=d.funded||d.cashSelected
 const action=s.estado==='asignado'&&paymentReady?{label:'Salir hacia el cliente',state:'en_camino' as const,disabled:false}:s.estado==='en_camino'?{label:'Confirmar llegada',state:'llegado' as const,disabled:false}:s.estado==='llegado'?{label:'Iniciar servicio',state:'en_progreso' as const,disabled:!evidence.initial}:s.estado==='en_progreso'?{label:'Finalizar y pedir aprobación',state:'esperando_aprobacion' as const,disabled:!evidence.final}:null
 const canConfirmCash=d.cashSelected&&!d.cashConfirmed&&['en_progreso','esperando_aprobacion'].includes(s.estado)
 return <section className="provider-screen"><span className="provider-kicker">MISIÓN ACTIVA</span><h1>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h1><article className="provider-card provider-detail"><span className="provider-chip">{s.estado.replaceAll('_',' ')}</span><p>{s.descripcion}</p><p>📍 {s.direccion_cliente||'Dirección por confirmar'}</p><strong>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong>{s.estado==='asignado'&&!paymentReady&&<div className="provider-payment-lock">🔒 Esperando que el cliente confirme la forma de pago.</div>}{d.funded&&<div className="provider-payment-ok">🔒 Pago protegido por UGO.</div>}{d.cashSelected&&!d.cashConfirmed&&<div className="provider-payment-lock">💵 Pago en efectivo seleccionado. No tiene custodia electrónica de UGO.</div>}{d.cashConfirmed&&<div className="provider-payment-ok">✓ Efectivo recibido y registrado.</div>}{s.estado==='llegado'&&!evidence.initial&&<div className="provider-payment-lock">📷 Registrá una evidencia “Antes” para poder iniciar.</div>}{s.estado==='en_progreso'&&!evidence.final&&<div className="provider-payment-lock">📷 Subí una evidencia “Después” antes de finalizar.</div>}{s.estado==='esperando_aprobacion'&&<div className="provider-payment-ok">✓ Trabajo enviado para aprobación del cliente.</div>}<PaymentTimeline payment={payment} serviceState={s.estado} compact/></article><ProviderEvidencePanel service={s} onReadinessChange={setEvidence}/>{action&&<button className="provider-primary provider-wide" disabled={d.busy||action.disabled} onClick={()=>d.advance(action.state)}>{d.busy?'Procesando…':action.label}</button>}{canConfirmCash&&<button className="provider-secondary provider-wide" disabled={d.busy} onClick={d.confirmCash}>{d.busy?'Procesando…':'Confirmar efectivo recibido'}</button>}<ServiceExpansionPanel role="provider" serviceId={s.id} compact/></section>
}
