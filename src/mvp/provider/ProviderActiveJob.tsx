import React from'react'
import{useProviderData,money}from'./providerData'

export function ProviderActiveJob(){
 const d=useProviderData(),s=d.service
 if(!s)return <section className="provider-screen"><span className="provider-kicker">TRABAJO ACTIVO</span><h1>No tenés una misión activa</h1><p>Cuando aceptes una oportunidad, vas a seguirla desde acá.</p></section>
 const action=s.estado==='asignado'&&d.funded?{label:'Salir hacia el cliente',state:'en_camino' as const}:s.estado==='en_camino'?{label:'Confirmar llegada',state:'llegado' as const}:s.estado==='llegado'?{label:'Iniciar servicio',state:'en_progreso' as const}:s.estado==='en_progreso'?{label:'Finalizar y pedir aprobación',state:'esperando_aprobacion' as const}:null
 return <section className="provider-screen"><span className="provider-kicker">MISIÓN ACTIVA</span><h1>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h1><article className="provider-card provider-detail"><span className="provider-chip">{s.estado.replaceAll('_',' ')}</span><p>{s.descripcion}</p><p>📍 {s.direccion_cliente||'Dirección por confirmar'}</p><strong>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong>{s.estado==='asignado'&&!d.funded&&<div className="provider-payment-lock">🔒 Esperando pago protegido. No inicies el servicio todavía.</div>}{s.estado==='esperando_aprobacion'&&<div className="provider-payment-ok">✓ Trabajo enviado para aprobación del cliente.</div>}</article>{action&&<button className="provider-primary provider-wide" disabled={d.busy} onClick={()=>d.advance(action.state)}>{d.busy?'Procesando…':action.label}</button>}</section>
}
