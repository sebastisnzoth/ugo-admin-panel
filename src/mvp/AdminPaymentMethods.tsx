import React,{useState}from'react'

type Props={
 config:Record<string,string>
 update:(clave:string,valor:string)=>Promise<void>
}

const enabled=(value:string|undefined)=>['true','1','si','sí'].includes(String(value??'true').toLowerCase())

export function AdminPaymentMethods({config,update}:Props){
 const[saving,setSaving]=useState<string|null>(null)
 const[message,setMessage]=useState('')
 const cash=enabled(config.pago_efectivo_activo)
 const br=enabled(config.pago_efectivo_br_activo)
 const ar=enabled(config.pago_efectivo_ar_activo)

 async function toggle(key:string,value:boolean){
  setSaving(key);setMessage('')
  try{await update(key,String(value));setMessage('Configuración de efectivo actualizada.')}
  catch(e){setMessage(e instanceof Error?e.message:'No se pudo actualizar el medio de pago.')}
  finally{setSaving(null)}
 }

 return <section className="ugo-system-card ugo-payment-methods">
  <div className="ugo-system-cardhead"><div><small>MEDIOS DE PAGO</small><h4>Efectivo</h4></div><span className={cash?'ugo-payment-status active':'ugo-payment-status'}>{cash?'Habilitado':'Deshabilitado'}</span></div>
  <div className="ugo-payment-method-summary"><div className="ugo-payment-method-icon" aria-hidden="true">$</div><div><strong>Pago presencial en efectivo</strong><p>El cliente paga al profesional al finalizar. UGO registra la selección, el cobro y la confirmación dentro del mismo servicio.</p></div></div>
  <div className="ugo-system-fields">
   <label className="ugo-system-field"><span><b>Habilitar efectivo</b><small>pago_efectivo_activo</small></span><select value={cash?'true':'false'} disabled={saving==='pago_efectivo_activo'} onChange={e=>void toggle('pago_efectivo_activo',e.target.value==='true')}><option value="true">Activado</option><option value="false">Desactivado</option></select></label>
   <label className="ugo-system-field"><span><b>Brasil · BRL</b><small>pago_efectivo_br_activo</small></span><select value={br?'true':'false'} disabled={!cash||saving==='pago_efectivo_br_activo'} onChange={e=>void toggle('pago_efectivo_br_activo',e.target.value==='true')}><option value="true">Activado</option><option value="false">Desactivado</option></select></label>
   <label className="ugo-system-field"><span><b>Argentina · ARS</b><small>pago_efectivo_ar_activo</small></span><select value={ar?'true':'false'} disabled={!cash||saving==='pago_efectivo_ar_activo'} onChange={e=>void toggle('pago_efectivo_ar_activo',e.target.value==='true')}><option value="true">Activado</option><option value="false">Desactivado</option></select></label>
  </div>
  <div className="ugo-payment-contract"><strong>Regla operativa</strong><span>El efectivo no usa credenciales ni pasarela. Debe ser elegido explícitamente por el cliente. El proveedor confirma la recepción al cierre y UGO conserva la trazabilidad.</span></div>
  {message&&<div className="ugo-payment-message" role="status">{message}</div>}
 </section>
}
